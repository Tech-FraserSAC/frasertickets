package controllers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/aritrosaha10/frasertickets/lib"
	"github.com/aritrosaha10/frasertickets/middleware"
	"github.com/aritrosaha10/frasertickets/models"
	"github.com/aritrosaha10/frasertickets/util"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/mongo"
)

type UserController struct{}

func (ctrl UserController) Routes() chi.Router {
	r := chi.NewRouter()
	r.Use(middleware.AuthenticatorMiddleware) // User must be authenticated before using any of these endpoints

	r.Post("/add", ctrl.Create) // POST /users/add - add new user to database, only run during sign up process

	// Admin-only route(s)
	r.Group(func(r chi.Router) {
		r.Use(middleware.AdminAuthorizerMiddleware)
		r.Get("/", ctrl.List) // GET /users - returns list of users, only available to admins
	})

	r.Route("/{id}", func(r chi.Router) {
		// Custom middleware function made specifically to check if requester if admin or accessing self data
		r.Use(func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				// Get ID token to get user's identity / UID
				idToken, err := util.GetUserTokenFromContext(r.Context())
				if err != nil {
					log.Error().Err(err).Msg("could not fetch user token from context")
					render.Render(w, r, util.ErrServer(err))
					return
				}

				// Get two main criteria for authorization
				isAdmin, _ := util.CheckIfAdmin(r.Context()) // error doesn't matter, bool defaults to false anyways
				isSelf := chi.URLParam(r, "id") == idToken.UID
				if !(isAdmin || isSelf) {
					log.Warn().Str("uid", idToken.UID).Msg("unauthorized user attempted to access another person's user profile")
					render.Render(w, r, util.ErrForbidden)
					return
				}

				next.ServeHTTP(w, r)
			})
		})

		r.Get("/", ctrl.Get) // GET /users/{id} - returns user data, only available to admins and user
		// r.Patch("/", ctrl.Update) // PATCH /users/{id} - updates user data, only available to admins and user
	})

	return r
}

// List returns all users.
//
//	@Summary		List all users
//	@Description	Lists all user data in the database. Only available to admins.
//	@Tags			user
//	@Produce		json
//	@Success		200	{object}	[]models.User
//	@Failure		500
//	@Router			/users [get]
func (ctrl UserController) List(w http.ResponseWriter, r *http.Request) {
	users, err := models.GetAllUsers(r.Context())
	if err != nil {
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Convert into list of renderers to turn into JSON
	list := []render.Renderer{}
	for _, user := range users {
		u := user // Duplicate it before passing by reference to avoid only passing the last user obj
		list = append(list, &u)
	}

	// Return as JSON array, fallback if it fails
	if err := render.RenderList(w, r, list); err != nil {
		render.Render(w, r, util.ErrRender(err))
		return
	}
}

// Create creates a database entry for a user on account creation.
//
//	@Summary		Create a user in DB on account creation
//	@Description	Creates a user in the database when they first make their account. Only available to new users.
//	@Tags			user
//	@Produce		json
//	@Success		200	{object}	models.User
//	@Failure		401
//	@Failure		403
//	@Failure		500
//	@Router			/users [post]
func (ctrl UserController) Create(w http.ResponseWriter, r *http.Request) {
	// Get UID and user record
	ctx := r.Context()
	userToken, err := util.GetUserTokenFromContext(ctx)
	if err != nil {
		log.Error().Err(err)
		render.Render(w, r, util.ErrServer(err))
		return
	}

	userRecord, err := lib.Auth.Client.GetUser(ctx, userToken.UID)
	if err != nil {
		log.Error().Err(err).Str("uid", userToken.UID).Msg("could not find user record with given uid")
		render.Render(w, r, util.ErrUnauthorized)
		return
	}

	// Check if they already have a user record in db
	userExists, err := models.CheckIfUserExists(ctx, userRecord.UID)
	if err != nil {
		log.Error().Err(err).Msg("could not check if user already exists in db")
		render.Render(w, r, util.ErrServer(err))
		return
	}
	if userExists {
		log.Info().Str("uid", userRecord.UID).Msg("user with existing entry in db tried to re-register")
		render.Render(w, r, util.ErrForbidden)
		return
	}

	// Extract student number from email
	studentNumber := strings.Replace(userRecord.Email, "@pdsb.net", "", -1)

	tmpUser := models.User{
		ID:            userRecord.UID,
		Admin:         false,
		StudentNumber: studentNumber,
		FullName:      userRecord.DisplayName,
		ProfilePicURL: userRecord.PhotoURL,
	}

	// Create the user doc in MongoDB
	id, err := models.CreateNewUser(r.Context(), tmpUser)
	if err != nil {
		render.Render(w, r, util.ErrServer(err))
		return
	}
	tmpUser.ID = id

	// Return as JSON, fallback if it fails
	if err := render.Render(w, r, &tmpUser); err != nil {
		render.Render(w, r, util.ErrRender(err))
		return
	}
}

// Get fetches a user's data.
//
//	@Summary		Gets user data
//	@Description	Get a user's data. Only available to admins and the requesting user.
//	@Tags			user
//	@Produce		json
//	@Param			id	path		string	true	"User ID"
//	@Success		200	{object}	models.User
//	@Failure		403
//	@Failure		404
//	@Failure		500
//	@Router			/users/{id} [get]
func (ctrl UserController) Get(w http.ResponseWriter, r *http.Request) {
	// Get ID of requested user
	id := chi.URLParam(r, "id")

	// Try to fetch data from DB
	user, err := models.GetUserByKey(r.Context(), "_id", id)

	// Handle errors
	if err != nil {
		if err == mongo.ErrNoDocuments {
			render.Render(w, r, util.ErrNotFound)
			return
		}

		log.Error().AnErr("err", err).Stack()
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Return as JSON, fallback if it fails
	if err := render.Render(w, r, &user); err != nil {
		render.Render(w, r, util.ErrRender(err))
		return
	}
}

// Update updates a user's data.
//
//	@Summary		Update user data (REMOVED)
//	@Description	Update a user's data. Only available to admins. Removed due to security issues.
//	@Tags			user
//	@Produce		json
//	@Param			id	path		string	true	"User ID"
//	@Param			updates	body		models.User	true	"Updates to make (anything can be changed by admins, admin/student_number/pfp_url cannot be changed by non-admins)"
//	@Success		200
//	@Failure		304
//	@Failure		400
//	@Failure		403
//	@Failure		404
//	@Failure		500
//	@Router			/users/{id} [patch]
func (ctrl UserController) Update(w http.ResponseWriter, r *http.Request) {
	// Update keys that should not be touched by a non-admin user
	PRIVILEGED_UPDATE_KEYS := map[string]bool{
		"admin":          true,
		"student_number": true,
		"pfp_url":        true,
	}

	// Get ID of requested user
	id := chi.URLParam(r, "id")

	// Get JSON body
	var requestedUpdates map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&requestedUpdates)
	if err != nil {
		log.Error().Stack().Err(err).Send()
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Check if it exists
	userData, err := models.GetUserByKey(r.Context(), "_id", id)
	if err == mongo.ErrNoDocuments {
		log.Error().Stack().Err(err).Send()
		render.Render(w, r, util.ErrNotFound)
		return
	}

	// Check if non-admin user is attempting to change prohibited traits
	if !userData.Admin {
		for key, val := range requestedUpdates {
			if _, ok := PRIVILEGED_UPDATE_KEYS[key]; ok {
				log.
					Warn().
					Str("uid", id).
					Str("desired-key", key).
					Any("desired-value", val).
					Msg("user attempted to update forbidden key")
				render.Render(w, r, util.ErrForbidden)
				return
			}
		}
	}

	// Try updating the appropriate document
	err = models.UpdateExistingUserByKeys(r.Context(), id, requestedUpdates)
	if err != nil {
		if err == models.ErrNoDocumentModified {
			log.Error().Stack().Err(err).Send()
			render.Render(w, r, util.ErrUnmodified)
			return
		} else if err == models.ErrEditNotAllowed {
			render.Render(w, r, util.ErrInvalidRequest(err))
			return
		}

		log.Error().Stack().Err(err).Send()
		render.Render(w, r, util.ErrServer(err))
		return
	}

	w.WriteHeader(http.StatusOK)
}

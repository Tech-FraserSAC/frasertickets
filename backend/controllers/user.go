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

		r.Get("/", ctrl.Get)      // GET /users/{id} - returns user data, only available to admins and user
		r.Patch("/", ctrl.Update) // PATCH /users/{id} - updates user data, only available to admins
	})

	r.Group(func(r chi.Router) {
		r.Use(middleware.AdminAuthorizerMiddleware)
		r.Patch("/{id}", ctrl.Update) // PATCH /users/{id} - updates user data, only available to admins
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

	// Write audit info log
	token, err := util.GetUserTokenFromContext(r.Context())
	requesterUID := ""
	if err == nil {
		requesterUID = token.UID
	}
	log.Info().
		Str("type", "audit").
		Str("controller", "user").
		Str("requester_uid", requesterUID).
		Str("action", "listUsers").
		Bool("privileged", true).
		Msg("fetched all users")
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

	// Check if they are using a school account or not
	if !strings.Contains(userRecord.Email, "@pdsb.net") {
		log.Warn().Str("uid", userToken.UID).Str("email", userRecord.Email).Msg("user attempting to sign in with personal account")
		render.Render(w, r, util.ErrUnauthorized)

		// Also delete the user for good measure
		lib.Auth.Client.DeleteUser(ctx, userToken.UID)

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

	// Look through queued tickets and create any that may belong to them
	queuedTickets, err := models.GetQueuedTicketsForStudentNumber(r.Context(), studentNumber)
	if err != nil {
		log.Error().Err(err).Str("uid", id).Msg("could not get queued tickets")
	} else {
		// TODO: Consider using goroutines? Not bothering right now since too complex to just register 1-2 tickets
		for i, queuedTicket := range queuedTickets {
			// No point in updating name multiple times
			ticket, err := models.ConvertQueuedTicketToTicket(r.Context(), queuedTicket, i == 0)
			log.Info().Any("ticket", ticket).Str("uid", id).Msg("converted queued ticket to ticket")
			if err != nil {
				log.Error().Err(err).Any("queuedTicket", queuedTicket).Str("uid", id).Msg("could not convert queued ticket to ticket")
			}
		}
	}

	// Write audit info log
	token, err := util.GetUserTokenFromContext(r.Context())
	requesterUID := ""
	if err == nil {
		requesterUID = token.UID
	}
	log.Info().
		Str("type", "audit").
		Str("controller", "user").
		Str("requester_uid", requesterUID).
		Str("action", "createUser").
		Bool("privileged", true).
		Msg("created new user")
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

	// Write audit info log
	token, err := util.GetUserTokenFromContext(r.Context())
	requesterUID := ""
	if err == nil {
		requesterUID = token.UID
	}
	log.Info().
		Str("type", "audit").
		Str("controller", "user").
		Str("requester_uid", requesterUID).
		Str("given_uid", id).
		Str("action", "getUser").
		Bool("privileged", id != requesterUID).
		Msg("fetched a user's data")
}

// Update updates a user's data.
//
//	@Summary		Update user data
//	@Description	Update a user's data. Only available to admins.
//	@Tags			user
//	@Produce		json
//	@Param			id	path		string	true	"User ID"
//	@Param			updates	body	models.User	true	"Updates to make (can only change full name for now)"
//	@Success		200
//	@Failure		304
//	@Failure		400
//	@Failure		403
//	@Failure		404
//	@Failure		500
//	@Router			/users/{id} [patch]
func (ctrl UserController) Update(w http.ResponseWriter, r *http.Request) {
	// Only keys that can be updated
	ALLOWED_KEYS := map[string]bool{
		"full_name": true,
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

	// Check if given user exists
	if exists, err := models.CheckIfUserExists(r.Context(), id); err != nil {
		log.Error().Stack().Err(err).Send()
		render.Render(w, r, util.ErrServer(err))
		return
	} else if !exists {
		log.Warn().Stack().Str("uid", id).Msg("given uid does not exist")
		render.Render(w, r, util.ErrNotFound)
		return
	}

	// Check if non-admin user is attempting to change prohibited traits
	for key, val := range requestedUpdates {
		if _, ok := ALLOWED_KEYS[key]; !ok {
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

	// Write audit info log
	token, err := util.GetUserTokenFromContext(r.Context())
	requesterUID := ""
	if err == nil {
		requesterUID = token.UID
	}
	log.Info().
		Str("type", "audit").
		Str("controller", "user").
		Str("requester_uid", requesterUID).
		Str("given_uid", id).
		Any("requested_updates", requestedUpdates).
		Str("action", "updateUser").
		Bool("privileged", true).
		Msg("updated a user's data")
}

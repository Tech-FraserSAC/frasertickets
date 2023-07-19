package controllers

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"strconv"

	"github.com/aritrosaha10/frasertickets/models"
	"github.com/aritrosaha10/frasertickets/util"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type UserController struct{}

func (ctrl UserController) Routes() chi.Router {
	r := chi.NewRouter()

	r.Get("/", ctrl.List)    // GET /users - returns list of users, only available to admins
	r.Post("/", ctrl.Create) // POST /users - add new user to database, only run during sign up process

	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", ctrl.Get)      // GET /users/{id} - returns user data, only available to admins and user
		r.Patch("/", ctrl.Update) // PATCH /users/{id} - updates user data, only available to admins and user
	})

	return r
}

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

func (ctrl UserController) Create(w http.ResponseWriter, r *http.Request) {
	// Create fake user for now
	// TODO: Fill in using info from token given
	tmpUser := models.User{
		ID:            uuid.NewString(),
		Admin:         false,
		StudentNumber: strconv.Itoa(rand.Intn(500000) + 500000),
		FirstName:     "Arnab",
		LastName:      "Saha",
		ProfilePicURL: "https://www.pngall.com/wp-content/uploads/5/Linux-PNG-Photo.png",
		TicketsOwned:  []primitive.ObjectID{},
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

func (ctrl UserController) Update(w http.ResponseWriter, r *http.Request) {
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
	_, err = models.GetUserByKey(r.Context(), "_id", id)
	if err == mongo.ErrNoDocuments {
		log.Error().Stack().Err(err).Send()
		render.Render(w, r, util.ErrNotFound)
		return
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

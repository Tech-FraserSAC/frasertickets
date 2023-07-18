package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

type UsersResource struct{}

func (rs UsersResource) Routes() chi.Router {
	r := chi.NewRouter()

	r.Get("/", rs.List)    // GET /users - returns list of users, only available to admins
	r.Post("/", rs.Create) // POST /users - add new user to database, only run during sign up process

	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", rs.Get)      // GET /users/{id} - returns user data, only available to admins and user
		r.Patch("/", rs.Update) // PATCH /users/{id} - updates user data, only available to admins and user
	})

	return r
}

func (rs UsersResource) List(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("..."))
}

func (rs UsersResource) Create(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("..."))
}

func (rs UsersResource) Get(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("..."))
}

func (rs UsersResource) Update(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("..."))
}

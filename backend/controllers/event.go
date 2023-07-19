package controllers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

type EventController struct{}

func (ctrl EventController) Routes() chi.Router {
	r := chi.NewRouter()

	r.Get("/", ctrl.List)    // GET /events - returns list of events, available to all
	r.Post("/", ctrl.Create) // POST /events - add new event to database, only available to admins

	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", ctrl.Get)               // GET /events/{id} - returns event data, available to all
		r.Get("/tickets", ctrl.GetTickets) // GET /events/{id}/tickets - returns all tickets for an event, only for admins
		r.Patch("/", ctrl.Update)          // PATCH /events/{id} - updates event data, only available to admins
		r.Delete("/", ctrl.Delete)         // DELETE /events/{id} - deletes event, only available to admins
	})

	return r
}

func (ctrl EventController) List(w http.ResponseWriter, r *http.Request) {

}

func (ctrl EventController) Create(w http.ResponseWriter, r *http.Request) {

}

func (ctrl EventController) Get(w http.ResponseWriter, r *http.Request) {

}

func (ctrl EventController) GetTickets(w http.ResponseWriter, r *http.Request) {

}

func (ctrl EventController) Update(w http.ResponseWriter, r *http.Request) {

}

func (ctrl EventController) Delete(w http.ResponseWriter, r *http.Request) {

}

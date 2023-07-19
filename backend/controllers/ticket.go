package controllers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

type TicketController struct{}

func (ctrl TicketController) Routes() chi.Router {
	r := chi.NewRouter()

	r.Get("/", ctrl.List)    // GET /tickets - returns all tickets, only available to admins
	r.Post("/", ctrl.Create) // POST /tickets - create a new ticket, only available to admins

	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", ctrl.Get)       // GET /tickets/{id} - returns ticket data, available to admins & ticket owner
		r.Delete("/", ctrl.Delete) // DELETE /events/{id} - delete ticket, only available to admins
	})

	return r
}

func (ctrl TicketController) List(w http.ResponseWriter, r *http.Request) {

}

func (ctrl TicketController) Create(w http.ResponseWriter, r *http.Request) {

}

func (ctrl TicketController) Get(w http.ResponseWriter, r *http.Request) {

}

func (ctrl TicketController) Delete(w http.ResponseWriter, r *http.Request) {

}

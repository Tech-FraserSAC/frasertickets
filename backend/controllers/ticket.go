package controllers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

type TicketController struct{}

func (ctrl TicketController) Routes() chi.Router {
	r := chi.NewRouter()

	r.Get("/", ctrl.ListSelf)   // GET /tickets - returns the requester's tickets, available to any user
	r.Get("/all", ctrl.ListAll) // GET /tickets/all - returns all tickets, only available to admins
	r.Post("/", ctrl.Create)    // POST /tickets - create a new ticket, only available to admins

	r.Route("/user/{uid}", func(r chi.Router) {
		r.Get("/", ctrl.ListUser) // GET /tickets/user/{uid} - returns a user's tickets, only available to admins
	})

	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", ctrl.Get)       // GET /tickets/{id} - returns ticket data, available to admins & ticket owner
		r.Delete("/", ctrl.Delete) // DELETE /events/{id} - delete ticket, only available to admins
	})

	return r
}

func (ctrl TicketController) ListSelf(w http.ResponseWriter, r *http.Request) {

}

func (ctrl TicketController) ListUser(w http.ResponseWriter, r *http.Request) {

}

func (ctrl TicketController) ListAll(w http.ResponseWriter, r *http.Request) {

}

func (ctrl TicketController) Create(w http.ResponseWriter, r *http.Request) {

}

func (ctrl TicketController) Get(w http.ResponseWriter, r *http.Request) {

}

func (ctrl TicketController) Delete(w http.ResponseWriter, r *http.Request) {

}

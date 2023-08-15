package controllers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/aritrosaha10/frasertickets/models"
	"github.com/aritrosaha10/frasertickets/util"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"github.com/go-playground/validator/v10"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type ticketControllerCreateRequestBody struct {
	OwnerID string `json:"ownerID" validate:"required"`
	EventID string `json:"eventID" validate:"required,mongodb"`
}

type ticketControllerSearchRequestBody struct {
	OwnerID string `json:"ownerID" validate:"required"`
	EventID string `json:"eventID" validate:"required,mongodb"`
}

type TicketController struct{}

func (ctrl TicketController) Routes() chi.Router {
	r := chi.NewRouter()

	r.Get("/", ctrl.ListSelf)      // GET /tickets - returns the requester's tickets, available to any user
	r.Post("/", ctrl.Create)       // POST /tickets - create a new ticket, only available to admins
	r.Get("/all", ctrl.ListAll)    // GET /tickets/all - returns all tickets, only available to admins
	r.Post("/search", ctrl.Search) // POST /tickets/search - search for a ticket given an owner and event, only available to admins

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
	// Get user UID
	userRecord, err := util.GetUserRecordFromContext(r.Context())
	if err != nil {
		log.Error().Err(err).Send()
		render.Render(w, r, util.ErrServer(err))
		return
	}
	uid := userRecord.UID

	// Check if user exists
	exists, err := models.CheckIfUserExists(r.Context(), uid)
	if err != nil {
		log.Error().Err(err).Msg("could not check if user exists")
		render.Render(w, r, util.ErrServer(err))
		return
	} else if !exists {
		log.Info().Err(err).Str("uid", uid).Msg("user could not be found")
		render.Render(w, r, util.ErrNotFound)
		return
	}

	// Try to get tickets
	tickets, err := models.GetTickets(r.Context(), bson.M{"owner": uid})
	if err != nil {
		log.Error().Err(err).Str("uid", uid).Msg("could not fetch user's tickets")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Convert into list of renderers to turn into JSON
	renderers := []render.Renderer{}
	for _, ticket := range tickets {
		t := ticket // Duplicate it before passing by reference to avoid only passing the last user obj
		renderers = append(renderers, &t)
	}

	// Return as JSON array, fallback if it fails
	if err := render.RenderList(w, r, renderers); err != nil {
		render.Render(w, r, util.ErrRender(err))
		return
	}
}

func (ctrl TicketController) ListUser(w http.ResponseWriter, r *http.Request) {
	// Get user UID
	uid := chi.URLParam(r, "uid")

	// Check if user exists
	exists, err := models.CheckIfUserExists(r.Context(), uid)
	if err != nil {
		log.Error().Err(err).Msg("could not check if user exists")
		render.Render(w, r, util.ErrServer(err))
		return
	} else if !exists {
		log.Info().Err(err).Str("uid", uid).Msg("user could not be found")
		render.Render(w, r, util.ErrNotFound)
		return
	}

	// Try to get tickets
	tickets, err := models.GetTickets(r.Context(), bson.M{"owner": uid})
	if err != nil {
		log.Error().Err(err).Str("uid", uid).Msg("could not fetch user's tickets")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Convert into list of renderers to turn into JSON
	renderers := []render.Renderer{}
	for _, ticket := range tickets {
		t := ticket // Duplicate it before passing by reference to avoid only passing the last user obj
		renderers = append(renderers, &t)
	}

	// Return as JSON array, fallback if it fails
	if err := render.RenderList(w, r, renderers); err != nil {
		render.Render(w, r, util.ErrRender(err))
		return
	}
}

func (ctrl TicketController) ListAll(w http.ResponseWriter, r *http.Request) {
	// Try to get tickets
	tickets, err := models.GetTickets(r.Context(), bson.M{})
	if err != nil {
		log.Error().Err(err).Msg("could not fetch all tickets")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Convert into list of renderers to turn into JSON
	renderers := []render.Renderer{}
	for _, ticket := range tickets {
		t := ticket // Duplicate it before passing by reference to avoid only passing the last user obj
		renderers = append(renderers, &t)
	}

	// Return as JSON array, fallback if it fails
	if err := render.RenderList(w, r, renderers); err != nil {
		render.Render(w, r, util.ErrRender(err))
		return
	}
}

func (ctrl TicketController) Create(w http.ResponseWriter, r *http.Request) {
	var (
		ticketRaw ticketControllerCreateRequestBody
		ticket    models.Ticket
	)

	// Parse JSON body
	bodyDecoder := json.NewDecoder(r.Body)
	bodyDecoder.DisallowUnknownFields()
	err := bodyDecoder.Decode(&ticketRaw)
	if err != nil {
		log.Error().Err(err).Msg("could not parse body")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Validate JSON body
	validate := validator.New()
	err = validate.Struct(ticketRaw)
	if err != nil {
		log.Error().Err(err).Msg("could not validate body")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Convert to ObjectID from string
	eventID, err := primitive.ObjectIDFromHex(ticketRaw.EventID)
	if err != nil {
		log.Error().Err(err).Str("id", ticketRaw.EventID).Msg("could not parse event id")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Transfer all data from raw to actual ticket
	ticket.Owner = ticketRaw.OwnerID
	ticket.Event = eventID
	ticket.Timestamp = time.Now()

	// Try to add to DB
	id, err := models.CreateNewTicket(r.Context(), ticket)
	if err != nil {
		var (
			renderErr render.Renderer
			errMsg    string
		)

		// Customize logged err msg & err sent to user depending on error
		switch err {
		case models.ErrAlreadyExists:
			{
				errMsg = "ticket with given event and owner ID already exists"
				renderErr = util.ErrConflict(errors.New(errMsg))
			}
		case models.ErrNotFound:
			{
				errMsg = "event or user given was not found"
				renderErr = util.ErrInvalidRequest(errors.New(errMsg))
			}
		default:
			{
				errMsg = "could not add ticket to db"
				renderErr = util.ErrServer(err)
			}
		}

		log.Error().Err(err).Str("owner", ticketRaw.OwnerID).Str("event", ticketRaw.EventID).Msg(errMsg)
		render.Render(w, r, renderErr)
		return
	}
	ticket.ID = id

	// Return as JSON, fallback if it fails
	if err := render.Render(w, r, &ticket); err != nil {
		render.Render(w, r, util.ErrRender(err))
		return
	}
}

func (ctrl TicketController) Get(w http.ResponseWriter, r *http.Request) {
	// Get ID of requested ticket
	id := chi.URLParam(r, "id")

	// Try to convert the given ID into an Object ID
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		log.Error().Err(err).Msg("could not convert url param to object id")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Try to fetch from DB
	ticket, err := models.GetTicket(r.Context(), objID)

	// Handle errors
	if err != nil {
		if err == mongo.ErrNoDocuments {
			render.Render(w, r, util.ErrNotFound)
			return
		}

		log.Error().Err(err).Msg("could not find ticket")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Return as JSON, fallback if it fails
	if err := render.Render(w, r, &ticket); err != nil {
		render.Render(w, r, util.ErrRender(err))
		return
	}
}

func (ctrl TicketController) Search(w http.ResponseWriter, r *http.Request) {
	var searchQuery ticketControllerSearchRequestBody

	// Parse JSON body
	bodyDecoder := json.NewDecoder(r.Body)
	bodyDecoder.DisallowUnknownFields()
	err := bodyDecoder.Decode(&searchQuery)
	if err != nil {
		log.Error().Err(err).Msg("could not parse body")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Validate JSON body
	validate := validator.New()
	err = validate.Struct(searchQuery)
	if err != nil {
		log.Error().Err(err).Msg("could not validate body")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Convert to ObjectID from string
	eventID, err := primitive.ObjectIDFromHex(searchQuery.EventID)
	if err != nil {
		log.Error().Err(err).Str("id", searchQuery.EventID).Msg("could not parse event id")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Try to fetch from DB
	ticket, err := models.SearchForTicket(r.Context(), eventID, searchQuery.OwnerID)

	// Handle errors
	if err != nil {
		if err == mongo.ErrNoDocuments {
			render.Render(w, r, util.ErrNotFound)
			return
		}

		log.Error().Err(err).Msg("could not find ticket")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Return as JSON, fallback if it fails
	if err := render.Render(w, r, &ticket); err != nil {
		render.Render(w, r, util.ErrRender(err))
		return
	}
}

func (ctrl TicketController) Delete(w http.ResponseWriter, r *http.Request) {
	// Get ID of requested ticket
	id := chi.URLParam(r, "id")

	// Convert to ObjectID
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		log.Error().Err(err).Msg("could not convert id to objectid")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Try to delete document
	err = models.DeleteTicket(r.Context(), objID)
	if err == models.ErrNoDocumentModified || err == mongo.ErrNoDocuments {
		log.Error().Err(err).Msg("could not find ticket to delete")
		render.Render(w, r, util.ErrNotFound)
		return
	} else if err != nil {
		log.Error().Err(err).Msg("could not delete ticket")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	w.WriteHeader(http.StatusOK)
}

// event ID: 64bdebd2be3ba505e0c17137
// user ID: 37907632-77e4-46ad-b133-6c589e5172e6

package controllers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/aritrosaha10/frasertickets/models"
	"github.com/aritrosaha10/frasertickets/util"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"github.com/go-playground/validator/v10"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type eventControllerCreateRequestBody struct {
	Name           string `json:"name"            validate:"required"`
	Description    string `json:"description"     validate:"required"`
	ImageURL       string `json:"img_url"         validate:"required"`
	Location       string `json:"location"        validate:"required"`
	Address        string `json:"address"         validate:"required"`
	StartTimestamp string `json:"start_timestamp" validate:"required,datetime=2006-01-01T15:00:00,ltefield=EndTimestamp"`
	EndTimestamp   string `json:"end_timestamp"   validate:"required,datetime=2006-01-02T15:00:00"`
}

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
	events, err := models.GetAllEvents(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("could not fetch events")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Convert into list of renderers to turn into JSON
	renderers := []render.Renderer{}
	for _, event := range events {
		e := event      // Duplicate before passing by reference
		e.Tickets = nil // Remove tickets since endpoint available to all
		renderers = append(renderers, &e)
	}

	// Return as JSON array, fallback if it fails
	if err := render.RenderList(w, r, renderers); err != nil {
		log.Error().Err(err).Msg("could not render events array")
		render.Render(w, r, util.ErrRender(err))
		return
	}
}

func (ctrl EventController) Create(w http.ResponseWriter, r *http.Request) {
	var (
		eventRaw eventControllerCreateRequestBody
		event    models.Event
	)

	// Parse JSON body
	bodyDecoder := json.NewDecoder(r.Body)
	bodyDecoder.DisallowUnknownFields()
	err := bodyDecoder.Decode(&eventRaw)
	if err != nil {
		log.Error().Err(err).Msg("could not parse body")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Validate JSON body
	validate := validator.New()
	err = validate.Struct(eventRaw)
	if err != nil {
		log.Error().Err(err).Msg("could not validate body")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Transfer all data from raw to actual event
	// TODO: Find a better way to do this (not sure how other than reflection,
	// which seems overkill)
	event.Name = eventRaw.Name
	event.Description = eventRaw.Description
	event.ImageURL = eventRaw.ImageURL
	event.Location = eventRaw.Location
	event.Address = eventRaw.Description

	// Time needs to parsed separately
	startTs, err := time.Parse("2006-01-02T15:00:00", eventRaw.StartTimestamp)
	if err != nil {
		log.Error().Err(err).Msg("could not parse start timestamp")
		render.Render(w, r, util.ErrServer(err))
		return
	}
	event.StartTimestamp = startTs

	endTs, err := time.Parse("2006-01-02T15:00:00", eventRaw.EndTimestamp)
	if err != nil {
		log.Error().Err(err).Msg("could not parse end timestamp")
		render.Render(w, r, util.ErrServer(err))
		return
	}
	event.EndTimestamp = endTs

	// Try to add to DB
	id, err := models.CreateNewEvent(r.Context(), event)
	if err != nil {
		render.Render(w, r, util.ErrServer(err))
		return
	}
	event.ID = id

	// Return as JSON, fallback if it fails
	if err := render.Render(w, r, &event); err != nil {
		render.Render(w, r, util.ErrRender(err))
		return
	}
}

func (ctrl EventController) Get(w http.ResponseWriter, r *http.Request) {
	// Get ID of requested event
	id := chi.URLParam(r, "id")

	// Try to convert the given ID into an Object ID
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		log.Error().Err(err).Msg("could not convert hex to object id")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Try to fetch from DB
	event, err := models.GetEventByKey(r.Context(), "_id", objID)

	// Handle errors
	if err != nil {
		if err == mongo.ErrNoDocuments {
			render.Render(w, r, util.ErrNotFound)
			return
		}

		log.Error().Err(err).Msg("could not find event")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Null out tickets to prevent leakage
	event.Tickets = nil

	// Return as JSON, fallback if it fails
	if err := render.Render(w, r, &event); err != nil {
		render.Render(w, r, util.ErrRender(err))
		return
	}
}

func (ctrl EventController) GetTickets(w http.ResponseWriter, r *http.Request) {
	// Get ID of requested event
	id := chi.URLParam(r, "id")

	// Try to convert the given ID into an Object ID
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		log.Error().Err(err).Msg("could not convert hex to object id")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Try to fetch from DB
	// event, err := models.GetEventByKey(r.Context(), "_id", objID)
	_, err = models.GetEventByKey(r.Context(), "_id", objID)

	// Handle errors
	if err != nil {
		if err == mongo.ErrNoDocuments {
			render.Render(w, r, util.ErrNotFound)
			return
		}

		log.Error().Err(err).Msg("could not find event")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// TODO: Fetch list of tickets
	// ticketRefs := event.Tickets
	var tickets []models.Ticket

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

func (ctrl EventController) Update(w http.ResponseWriter, r *http.Request) {
	// Get ID of requested event
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
	_, err = models.GetEventByKey(r.Context(), "_id", id)
	if err == mongo.ErrNoDocuments {
		log.Error().Stack().Err(err).Send()
		render.Render(w, r, util.ErrNotFound)
		return
	}

	// Try updating the appropriate document
	err = models.UpdateExistingEvent(r.Context(), id, requestedUpdates)
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

func (ctrl EventController) Delete(w http.ResponseWriter, r *http.Request) {
	// Get ID of requested event
	id := chi.URLParam(r, "id")
	// Convert to ObjectID
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		log.Error().Err(err).Msg("could not convert id to objectid")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Try to delete document
	err = models.DeleteEvent(r.Context(), objID)
	if err == models.ErrNoDocumentModified || err == mongo.ErrNoDocuments {
		log.Error().Err(err).Msg("could not find event to delete")
		render.Render(w, r, util.ErrNotFound)
		return
	} else if err != nil {
		log.Error().Err(err).Msg("could not delete event")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	w.WriteHeader(http.StatusOK)
}

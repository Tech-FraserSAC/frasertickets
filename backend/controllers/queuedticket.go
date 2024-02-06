package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/aritrosaha10/frasertickets/middleware"
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

type queuedTicketControllerCreateRequestBody struct {
	StudentNumber string `json:"studentNumber" validate:"required"`
	EventID       string `json:"eventID" validate:"required,mongodb"`
	MaxScanCount  int    `json:"maxScanCount" validate:"gte=0"`
}

type QueuedTicketController struct{}

func (ctrl QueuedTicketController) Routes() chi.Router {
	r := chi.NewRouter()
	r.Use(middleware.AuthenticatorMiddleware) // User must be authenticated before using any of these endpoints

	// Admin-only routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.AdminAuthorizerMiddleware)
		r.Post("/", ctrl.Create)       // POST /queuedtickets - create a new ticket, only available to admins
		r.Get("/", ctrl.ListAll)       // GET /queuedtickets - returns all tickets, only available to admins
		r.Delete("/{id}", ctrl.Delete) // DELETE /queuedtickets/{id} - deletes a queued ticket, only available to admins
	})

	return r
}

// ListAll fetches all queued tickets that exist.
//
//	@Summary		List all queued tickets
//	@Description	List all queued tickets. Only available to admins.
//	@Tags			queuedticket
//	@Produce		json
//	@Success		200	{object}	[]models.QueuedTicket
//	@Failure		403
//	@Failure		500
//	@Router			/queuedtickets [get]
func (ctrl QueuedTicketController) ListAll(w http.ResponseWriter, r *http.Request) {
	// Try to get tickets
	queuedTickets, err := models.GetAllQueuedTickets(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("could not fetch all queued tickets")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Convert into list of renderers to turn into JSON
	renderers := []render.Renderer{}
	for _, queuedTicket := range queuedTickets {
		t := queuedTicket // Duplicate it before passing by reference to avoid only passing the last obj
		renderers = append(renderers, &t)
	}

	// Return as JSON array, fallback if it fails
	if err := render.RenderList(w, r, renderers); err != nil {
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
		Str("controller", "queuedticket").
		Str("requester_uid", requesterUID).
		Str("action", "listAllQueuedTickets").
		Bool("privileged", true).
		Msg("listed all queued tickets")
}

// Create creates a new queued ticket.
//
//		@Summary		Create new queued ticket
//		@Description	Create a new queued ticket. Only available to admins.
//		@Tags			ticket
//	 	@Accept 		json
//		@Produce		json
//		@Param			event	body		queuedTicketControllerCreateRequestBody	true	"Queued ticket details"
//		@Success		200		{object}	models.QueuedTicket
//		@Failure		400
//		@Failure		403
//		@Failure		404
//		@Failure		409
//		@Failure		500
//		@Router			/queuedtickets [post]
func (ctrl QueuedTicketController) Create(w http.ResponseWriter, r *http.Request) {
	var (
		queuedTicketRaw queuedTicketControllerCreateRequestBody
		queuedTicket    models.QueuedTicket
	)

	// Parse JSON body
	bodyDecoder := json.NewDecoder(r.Body)
	bodyDecoder.DisallowUnknownFields()
	err := bodyDecoder.Decode(&queuedTicketRaw)
	if err != nil {
		log.Error().Err(err).Msg("could not parse body")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Validate JSON body
	validate := validator.New()
	err = validate.Struct(queuedTicketRaw)
	if err != nil {
		log.Error().Err(err).Msg("could not validate body")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Confirm that max scan count >= 0 (validator doesn't want to do this for some reason)
	if queuedTicketRaw.MaxScanCount < 0 {
		err := fmt.Errorf("max scan count must be greater than or equal to 0")
		log.Error().Err(err).Msg("invalid max scan count")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Convert to ObjectID from string
	eventID, err := primitive.ObjectIDFromHex(queuedTicketRaw.EventID)
	if err != nil {
		log.Error().Err(err).Str("id", queuedTicketRaw.EventID).Msg("could not parse event id")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Check if event exists
	_, err = models.GetEvent(r.Context(), bson.M{"_id": eventID})
	if err == mongo.ErrNoDocuments {
		log.Error().Err(err).Str("id", queuedTicketRaw.EventID).Msg("no such event exists")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	} else if err != nil {
		log.Error().Err(err).Str("id", queuedTicketRaw.EventID).Msg("could not fetch event data")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Try to find the user object associated with student number
	user, err := models.GetUserByKey(r.Context(), "student_number", queuedTicketRaw.StudentNumber)
	if err == nil {
		log.Error().Err(err).Str("id", queuedTicketRaw.StudentNumber).Msg("user already exists, no need to make queued ticket")
		render.Render(w, r, util.ErrInvalidRequest(fmt.Errorf("user already exists, no need to make queued ticket")))
		return
	} else if err != nil && err != mongo.ErrNoDocuments {
		log.Error().Err(err).Str("id", queuedTicketRaw.StudentNumber).Msg("could not fetch user data")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Transfer all data from raw to actual ticket
	queuedTicket.EventID = eventID
	queuedTicket.MaxScanCount = queuedTicketRaw.MaxScanCount
	queuedTicket.StudentNumber = queuedTicketRaw.StudentNumber
	queuedTicket.Timestamp = time.Now()

	// Try to add to DB
	id, err := models.CreateQueuedTicket(r.Context(), queuedTicket)
	if err != nil {
		var (
			renderErr render.Renderer
			errMsg    string
		)

		// Customize logged err msg & err sent to user depending on error
		switch err {
		case models.ErrAlreadyExists:
			{
				errMsg = "ticket with given event and owner already exists"
				renderErr = util.ErrConflict(errors.New(errMsg))
			}
		case models.ErrNotFound:
			{
				errMsg = "event given was not found"
				renderErr = util.ErrInvalidRequest(errors.New(errMsg))
			}
		default:
			{
				errMsg = "could not add ticket to db"
				renderErr = util.ErrServer(err)
			}
		}

		log.Error().Err(err).Str("owner", user.ID).Str("event", queuedTicketRaw.EventID).Msg(errMsg)
		render.Render(w, r, renderErr)
		return
	}
	queuedTicket.ID = id

	// Return as JSON, fallback if it fails
	if err := render.Render(w, r, &queuedTicket); err != nil {
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
		Str("controller", "ticket").
		Str("requester_uid", requesterUID).
		Any("ticket_data", queuedTicket).
		Str("action", "createTicket").
		Bool("privileged", true).
		Msg("created a new ticket")
}

// Delete deletes a queued ticket.
//
//	@Summary		Delete a queued ticket
//	@Description	Deletes a queued ticket. Only available to admins.
//	@Tags			ticket
//	@Accept			json
//	@Param			id	path		string	true	"Queued ticket ID"
//	@Success		200
//	@Failure		403
//	@Failure		404
//	@Failure		500
//	@Router			/queuedtickets/{id} [delete]
func (ctrl QueuedTicketController) Delete(w http.ResponseWriter, r *http.Request) {
	// Get ID of requested queued ticket
	id := chi.URLParam(r, "id")

	// Convert to ObjectID
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		log.Error().Err(err).Msg("could not convert id to objectid")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Fetch queued ticket data so that we can log it later, since we won't be able
	// to access the ticket later. Errors should be handled in the delete ticket
	queuedTicket, _ := models.GetQueuedTicket(r.Context(), objID)

	// Try to delete document
	err = models.DeleteQueuedTicket(r.Context(), objID)
	if err == models.ErrNoDocumentModified || err == mongo.ErrNoDocuments {
		log.Error().Err(err).Msg("could not find queued ticket to delete")
		render.Render(w, r, util.ErrNotFound)
		return
	} else if err != nil {
		log.Error().Err(err).Msg("could not delete queued ticket")
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
		Str("controller", "queuedticket").
		Str("requester_uid", requesterUID).
		Str("ticket_id", objID.Hex()).
		Any("queued_ticket", queuedTicket).
		Str("action", "deleteQueuedTicket").
		Bool("privileged", true).
		Msg("deleted queued ticket")
}

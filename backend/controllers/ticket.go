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

type ticketControllerCreateRequestBody struct {
	StudentNumber string `json:"studentNumber" validate:"required"`
	EventID       string `json:"eventID" validate:"required,mongodb"`
	MaxScanCount  int    `json:"maxScanCount" validate:"gte=0"`
}

type ticketControllerSearchRequestBody struct {
	OwnerID string `json:"ownerID" validate:"required"`
	EventID string `json:"eventID" validate:"required,mongodb"`
}

type ticketControllerScanRequestBody struct {
	TicketID string `json:"ticketID" validate:"required,mongodb"`
}

type TicketController struct{}

func (ctrl TicketController) Routes() chi.Router {
	r := chi.NewRouter()
	r.Use(middleware.AuthenticatorMiddleware) // User must be authenticated before using any of these endpoints

	r.Get("/", ctrl.ListSelf) // GET /tickets - returns the requester's tickets, available to any user

	// Admin-only routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.AdminAuthorizerMiddleware)
		r.Post("/", ctrl.Create)       // POST /tickets - create a new ticket, only available to admins
		r.Get("/all", ctrl.ListAll)    // GET /tickets/all - returns all tickets, only available to admins
		r.Post("/search", ctrl.Search) // POST /tickets/search - search for a ticket given an owner and event, only available to admins
		r.Post("/scan", ctrl.Scan)     // POST /tickets/scan - scan a ticket, only available to admins
	})

	r.Route("/user/{uid}", func(r chi.Router) {
		r.Use(middleware.AdminAuthorizerMiddleware)
		r.Get("/", ctrl.ListUser) // GET /tickets/user/{uid} - returns a user's tickets, only available to admins
	})

	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", ctrl.Get) // GET /tickets/{id} - returns ticket data, available to admins & ticket owner

		// Admin-only routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.AdminAuthorizerMiddleware)
			r.Delete("/", ctrl.Delete) // DELETE /events/{id} - delete ticket, only available to admins
		})
	})

	return r
}

// ListSelf fetches all the requester's tickets using their token in Context.
//
//	@Summary		List the requesting user's tickets
//	@Description	List the tickets owned by the user sending the request. Available to all users.
//	@Tags			ticket
//	@Produce		json
//	@Success		200	{object}	[]models.Ticket
//	@Failure		404
//	@Failure		500
//	@Router			/tickets [get]
func (ctrl TicketController) ListSelf(w http.ResponseWriter, r *http.Request) {
	// Get user UID
	userToken, err := util.GetUserTokenFromContext(r.Context())
	if err != nil {
		log.Error().Err(err).Send()
		render.Render(w, r, util.ErrServer(err))
		return
	}
	uid := userToken.UID

	// Try to get tickets
	tickets, err := models.GetTickets(r.Context(), bson.M{"owner": uid})
	if err != nil {
		log.Error().Err(err).Str("uid", uid).Msg("could not fetch user's tickets")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Check if user exists in DB if no tickets exist
	if len(tickets) == 0 {
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

// ListUser fetches all of a given user's tickets.
//
//	@Summary		List a user's tickets
//	@Description	List the tickets owned by the user sending the request. Only available to admins.
//	@Tags			ticket
//	@Produce		json
//	@Param			uid	path		string	true	"User ID"
//	@Success		200	{object}	[]models.Ticket
//	@Failure		403
//	@Failure		404
//	@Failure		500
//	@Router			/tickets/user/{uid} [get]
func (ctrl TicketController) ListUser(w http.ResponseWriter, r *http.Request) {
	// Get user UID
	uid := chi.URLParam(r, "uid")

	// Try to get tickets
	tickets, err := models.GetTickets(r.Context(), bson.M{"owner": uid})
	if err != nil {
		log.Error().Err(err).Str("uid", uid).Msg("could not fetch user's tickets")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Check if user even exists if no tickets found
	if len(tickets) == 0 {
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

// ListAll fetches all tickets that exist.
//
//	@Summary		List all tickets
//	@Description	List all tickets. Only available to admins.
//	@Tags			ticket
//	@Produce		json
//	@Success		200	{object}	[]models.Ticket
//	@Failure		403
//	@Failure		500
//	@Router			/tickets/all [get]
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

// Create creates a new ticket.
//
//		@Summary		Create new ticket
//		@Description	Create a new ticket. Only available to admins.
//		@Tags			ticket
//	 @Accept json
//		@Produce		json
//		@Param			event	body		ticketControllerCreateRequestBody	true	"Ticket details"
//		@Success		200	{object}	models.Ticket
//		@Failure		400
//		@Failure		403
//		@Failure		404
//		@Failure		409
//		@Failure		500
//		@Router			/tickets [post]
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

	// Confirm that max scan count >= 0 (validator doesn't want to do this for some reason)
	if ticketRaw.MaxScanCount < 0 {
		err := fmt.Errorf("max scan count must be greater than or equal to 0")
		log.Error().Err(err).Msg("invalid max scan count")
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

	// Check if event exists
	event, err := models.GetEvent(r.Context(), bson.M{"_id": eventID})
	if err == mongo.ErrNoDocuments {
		log.Error().Err(err).Str("id", ticketRaw.EventID).Msg("no such event exists")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	} else if err != nil {
		log.Error().Err(err).Str("id", ticketRaw.EventID).Msg("could not fetch event data")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Try to find the user object associated with student number
	user, err := models.GetUserByKey(r.Context(), "student_number", ticketRaw.StudentNumber)
	if err == mongo.ErrNoDocuments {
		log.Error().Err(err).Str("id", ticketRaw.StudentNumber).Msg("no such user exists")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	} else if err != nil {
		log.Error().Err(err).Str("id", ticketRaw.StudentNumber).Msg("could not fetch user data")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Transfer all data from raw to actual ticket
	ticket.Owner = user.ID
	ticket.Event = eventID
	ticket.EventData = event
	ticket.Timestamp = time.Now()
	ticket.MaxScanCount = ticketRaw.MaxScanCount

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

		log.Error().Err(err).Str("owner", user.ID).Str("event", ticketRaw.EventID).Msg(errMsg)
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

// Get fetches a single ticket.
//
//	@Summary		Get one ticket
//	@Description	Get one ticket. Only available to admins and the ticket owner.
//	@Tags			ticket
//	@Produce		json
//	@Param			id	path		string	true	"Ticket ID"
//	@Success		200	{object}	models.Ticket
//	@Failure		403
//	@Failure		404
//	@Failure		500
//	@Router			/tickets/{id} [get]
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

	// Check if they are authorized to use endpoint (admin or ticket owner)
	// This runs after the data fetch process so we can grab the ticket owner UID
	isAdmin, err := util.CheckIfAdmin(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("could not check if requester is admin")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Check if they're the owner of the ticket
	idToken, _ := util.GetUserTokenFromContext(r.Context()) // Not error-checking because this gets fetched in admin check
	isOwner := ticket.Owner == idToken.UID

	// Do final authorization check
	if !(isAdmin || isOwner) {
		log.Warn().Str("uid", idToken.UID).Msg("unauthorized user attempting to access another person's ticket")
		render.Render(w, r, util.ErrForbidden)
		return
	}

	// Return as JSON, fallback if it fails
	if err := render.Render(w, r, &ticket); err != nil {
		render.Render(w, r, util.ErrRender(err))
		return
	}
}

// Search gets a ticket based on its owner and an event.
//
//	@Summary		Search for ticket using owner and event
//	@Description	Search for a ticket by using the owner and associated event. Only available to admins.
//	@Tags			ticket
//	@Accept			json
//	@Produce		json
//	@Param			searchQuery	body		ticketControllerSearchRequestBody	true	"Search query"
//	@Success		200	{object}	models.Ticket
//	@Failure		403
//	@Failure		404
//	@Failure		500
//	@Router			/tickets/search [post]
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

// Scan records a scanning event for a ticket.
//
//	@Summary		Scans a ticket
//	@Description	Scans in a ticket given the ticket ID. Only available to admins.
//	@Tags			ticket
//	@Accept			json
//	@Produce		json
//	@Param			searchQuery	body		ticketControllerScanRequestBody	true	"Search query"
//	@Success		200	{object}	models.TicketScan
//	@Failure		403
//	@Failure		404
//	@Failure		500
//	@Router			/tickets/scan [post]
func (ctrl TicketController) Scan(w http.ResponseWriter, r *http.Request) {
	var searchQuery ticketControllerScanRequestBody

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
	ticketID, err := primitive.ObjectIDFromHex(searchQuery.TicketID)
	if err != nil {
		log.Error().Err(err).Str("id", searchQuery.TicketID).Msg("could not parse ticket id")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Try to fetch from DB
	ticket, err := models.GetTicket(r.Context(), ticketID)

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

	// Get user associated with ticket
	ticketOwner, err := models.GetUserByKey(r.Context(), "_id", ticket.Owner)
	// Handle errors
	if err != nil {
		log.Error().Err(err).Msg("could not find user associated with ticket")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Create scan info obj to return
	scanData := models.TicketScan{
		Index:           ticket.ScanCount + 1,
		Timestamp:       time.Now(),
		TicketData:      ticket,
		UserData:        ticketOwner,
		Processed:       true,
		NoProcessReason: "",
	}

	// Check if max scan count has been exceeded
	// Max scan count of 0 means unlimited
	if scanData.Index > ticket.MaxScanCount && ticket.MaxScanCount != 0 {
		log.Warn().Msg("could not scan ticket since max scan count exceeded")

		// Reset scan data to show previous scan
		scanData.Index = ticket.ScanCount
		scanData.Timestamp = ticket.LastScanTimestamp
		scanData.Processed = false
		scanData.NoProcessReason = "max scan count exceeded"

		// Return as JSON, fallback if it fails
		if err := render.Render(w, r, &scanData); err != nil {
			render.Render(w, r, util.ErrRender(err))
			return
		}

		return
	}

	// Update ticket info with new scan data
	ticket.ScanCount = scanData.Index
	ticket.LastScanTimestamp = scanData.Timestamp
	err = models.UpdateExistingTicketByKeys(r.Context(), ticket.ID, map[string]interface{}{
		"lastScanTime": scanData.Timestamp,
		"scanCount":    scanData.Index,
	})
	// Handle errors
	if err != nil {
		log.Error().Err(err).Msg("could not update ticket with new info")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Return as JSON, fallback if it fails
	if err := render.Render(w, r, &scanData); err != nil {
		render.Render(w, r, util.ErrRender(err))
		return
	}
}

// Delete deletes a ticket.
//
//	@Summary		Delete a ticket
//	@Description	Deletes a ticket. Only available to admins.
//	@Tags			ticket
//	@Accept			json
//	@Param			id	path		string	true	"Ticket ID"
//	@Success		200
//	@Failure		403
//	@Failure		404
//	@Failure		500
//	@Router			/tickets/{id}/delete [post]
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

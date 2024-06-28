package controllers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"cloud.google.com/go/storage"
	"github.com/aritrosaha10/frasertickets/lib"
	"github.com/aritrosaha10/frasertickets/middleware"
	"github.com/aritrosaha10/frasertickets/models"
	"github.com/aritrosaha10/frasertickets/util"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/h2non/bimg"
	"github.com/rs/zerolog/log"
	"github.com/xeipuuv/gojsonschema"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type eventControllerCreateRequestBody struct {
	Name                  string                 `json:"name"            validate:"required"`
	Description           string                 `json:"description"     validate:"required"`
	Location              string                 `json:"location"        validate:"required"`
	Address               string                 `json:"address"         validate:"required"`
	StartTimestamp        string                 `json:"start_timestamp" validate:"required"`
	EndTimestamp          string                 `json:"end_timestamp"   validate:"required"`
	RawCustomFieldsSchema map[string]interface{} `json:"custom_fields_schema" validate:"required"`
}

type EventController struct{}

func (ctrl EventController) Routes() chi.Router {
	r := chi.NewRouter()
	r.Use(middleware.AuthenticatorMiddleware) // User must be authenticated before using any of these endpoints

	r.Get("/", ctrl.List) // GET /events - returns list of events, available to all

	// Admin-only routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.AdminAuthorizerMiddleware)
		r.Post("/", ctrl.Create) // POST /events - add new event to database, only available to admins
	})

	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", ctrl.Get) // GET /events/{id} - returns event data, available to all

		// Admin-only routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.AdminAuthorizerMiddleware)
			r.Get("/tickets", ctrl.GetTickets)          // GET /events/{id}/tickets - returns all tickets for an event, only for admins
			r.Get("/ticket-count", ctrl.GetTicketCount) // GET /events/{id}/ticket-count - returns # of tickets for an event, only for admins
			r.Patch("/", ctrl.Update)                   // PATCH /events/{id} - updates event data, only available to admins
			r.Delete("/", ctrl.Delete)                  // DELETE /events/{id} - deletes event, only available to admins
		})
	})

	return r
}

// List godoc
//
//	@Summary		List all events
//	@Description	Lists all events in the database. Available to all users.
//	@Tags			event
//	@Produce		json
//	@Success		200	{object}	[]models.Event
//	@Failure		500
//	@Security		ApiKeyAuth
//	@Router			/events [get]
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
		e := event // Duplicate before passing by reference
		renderers = append(renderers, &e)
	}

	// Return as JSON array, fallback if it fails
	if err := render.RenderList(w, r, renderers); err != nil {
		log.Error().Err(err).Msg("could not render events array")
		render.Render(w, r, util.ErrRender(err))
		return
	}

	// Write audit info log
	token, err := util.GetUserTokenFromContext(r.Context())
	uid := ""
	if err == nil {
		uid = token.UID
	}
	log.Info().
		Str("type", "audit").
		Str("controller", "event").
		Str("requester_uid", uid).
		Str("action", "listAllEvents").
		Bool("privileged", false).
		Msg("fetched all events")
}

// Create godoc
//
//	@Summary		Create an event
//	@Description	Creates an event in the database. Only available to admins.
//	@Tags			event
//	@Accept			multipart/form-data
//	@Produce		json
//	@Success		200		{object}	models.Event
//	@Failure		400
//	@Failure		500
//	@Security		ApiKeyAuth
//	@Router			/events [post]
func (ctrl EventController) Create(w http.ResponseWriter, r *http.Request) {
	var (
		eventRaw eventControllerCreateRequestBody
		event    models.Event
	)

	// TODO: maybe consider using formstream in the future if performance optimizations are needed
	err := r.ParseMultipartForm(30 << 20) // 30 MB
	if err != nil {
		render.Render(w, r, util.ErrInvalidRequest(fmt.Errorf("raw form data is invalid")))
		return
	}

	// Parse raw form data into struct for simple validation later
	eventRaw.Name = r.PostFormValue("name")
	eventRaw.Description = r.PostFormValue("description")
	eventRaw.Location = r.PostFormValue("location")
	eventRaw.Address = r.PostFormValue("address")
	eventRaw.StartTimestamp = r.PostFormValue("start_timestamp")
	eventRaw.EndTimestamp = r.PostFormValue("end_timestamp")
	// Can't provide a JSON object into FormData, so we need to parse it beforehand
	var rawCustomFieldsSchema map[string]interface{}
	if err = json.Unmarshal([]byte(r.PostFormValue("custom_fields_schema")), &rawCustomFieldsSchema); err != nil {
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}
	eventRaw.RawCustomFieldsSchema = rawCustomFieldsSchema

	// Validate body
	validate := validator.New()
	err = validate.Struct(eventRaw)
	if err != nil {
		log.Error().Err(err).Msg("could not validate body")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Validate all files are photos before proceeding
	// TODO: Make this multithreaded
	fileHeaders := r.MultipartForm.File["images"]
	ok := true
	for i, fileHeader := range fileHeaders {
		if i > 4 {
			render.Render(w, r, util.ErrInvalidRequest(fmt.Errorf("more than 5 images provided")))
			ok = false
			break
		}

		mimeType := fileHeader.Header.Get("Content-Type")
		if mimeType != "image/png" && mimeType != "image/jpeg" {
			render.Render(w, r, util.ErrInvalidRequest(fmt.Errorf("non-image file provided, only provide png or jpg files")))
			ok = false
			break
		}
	}
	if !ok {
		return
	}

	// Process and upload all photos
	// TODO: Make this multithreaded
	imgUrls := make([]string, len(fileHeaders))
	for i, fileHeader := range fileHeaders {
		file, err := fileHeader.Open()
		if err != nil {
			render.Render(w, r, util.ErrInvalidRequest(errors.Join(fmt.Errorf("could not open provided image"), err)))
			ok = false
			break
		}
		defer file.Close()

		buf := bytes.NewBuffer(nil)
		if _, err := io.Copy(buf, file); err != nil {
			render.Render(w, r, util.ErrInvalidRequest(errors.Join(fmt.Errorf("could not parse provided image"), err)))
			ok = false
			break
		}

		img := bimg.NewImage(buf.Bytes())
		imgSize, err := img.Size()
		if err != nil {
			render.Render(w, r, util.ErrInvalidRequest(errors.Join(fmt.Errorf("failed to get img size"), err)))
			ok = false
			break
		}
		imgOpts := bimg.Options{
			Quality: 100,
			Width:   imgSize.Width,
			Height:  imgSize.Height,
			Type:    bimg.WEBP,
		}

		// Crop to 2000px width if larger
		if imgSize.Width > 2000 {
			imgOpts.Width = 2000
			imgOpts.Height = imgSize.Height * 2000 / imgSize.Width
		} else if imgSize.Height > 2000 {
			imgOpts.Height = 1000
			imgOpts.Width = imgSize.Width * 2000 / imgSize.Height
		}

		processedImg, err := img.Process(imgOpts)
		if err != nil {
			render.Render(w, r, util.ErrInvalidRequest(errors.Join(fmt.Errorf("could not compress image"), err)))
			ok = false
			break
		}

		// Start writing image to GCP
		processedImgFname := uuid.New().String() + ".webp"
		cloudStorageObj := lib.CloudStorage.MediaBucket.Object(processedImgFname)

		// Prepare to write byte array to cloud storage
		wc := cloudStorageObj.NewWriter(r.Context())
		if _, err = wc.Write(processedImg); err != nil {
			log.Error().Err(err).Msg("could not write bytes to cloud storage")
			render.Render(w, r, util.ErrServer(fmt.Errorf("could not save image")))
			ok = false
			break
		}
		if err = wc.Close(); err != nil {
			log.Error().Err(err).Msg("could not close byte writer to cloud storage")
			render.Render(w, r, util.ErrServer(fmt.Errorf("could not save image")))
			ok = false
			break
		}

		if err = cloudStorageObj.ACL().Set(r.Context(), storage.AllUsers, storage.RoleReader); err != nil {
			log.Error().Err(err).Msg("could not set permissions of cloud storage obj")
			render.Render(w, r, util.ErrServer(fmt.Errorf("could not save image")))
			ok = false
			break
		}

		url := fmt.Sprintf("https://storage.googleapis.com/%s/%s", lib.CloudStorage.MediaBucketName, processedImgFname)
		imgUrls[i] = url
		log.Info().Str("url", url).Msg("uploaded image to gcp")
	}
	if !ok {
		return
	}

	// Transfer all data from raw to actual event
	// TODO: Find a better way to do this (not sure how other than reflection,
	// which seems overkill)
	event.Name = eventRaw.Name
	event.Description = eventRaw.Description
	event.ImageURLs = imgUrls
	event.Location = eventRaw.Location
	event.Address = eventRaw.Description

	// Time needs to parsed separately
	startTs, err := time.Parse(time.RFC3339, eventRaw.StartTimestamp)
	if err != nil {
		log.Error().Err(err).Msg("could not parse start timestamp")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}
	event.StartTimestamp = startTs

	endTs, err := time.Parse(time.RFC3339, eventRaw.EndTimestamp)
	if err != nil {
		log.Error().Err(err).Msg("could not parse end timestamp")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}
	event.EndTimestamp = endTs

	if startTs.Compare(endTs) != -1 {
		log.Error().Time("start", startTs).Time("end", endTs).Msg("start timestamp is not before end timestamp")
		render.Render(w, r, util.ErrInvalidRequest(fmt.Errorf("start timestamp is not before end timestamp")))
		return
	}

	// Validate custom fields schema
	schemaLoader := gojsonschema.NewGoLoader(eventRaw.RawCustomFieldsSchema)
	_, err = gojsonschema.NewSchema(schemaLoader)
	if err != nil {
		log.Error().Any("rawJSONSchema", eventRaw.RawCustomFieldsSchema).Err(err).Msg("raw JSON schema is invalid")
		render.Render(w, r, util.ErrInvalidRequest(fmt.Errorf("raw JSON schema is invalid")))
		return
	}
	event.RawCustomFieldsSchema = eventRaw.RawCustomFieldsSchema

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

	// Write audit info log
	token, err := util.GetUserTokenFromContext(r.Context())
	uid := ""
	if err == nil {
		uid = token.UID
	}
	log.Info().
		Str("type", "audit").
		Str("controller", "event").
		Str("requester_uid", uid).
		Str("action", "createEvent").
		Any("eventData", event).
		Bool("privileged", true).
		Msg("event created")
}

// List godoc
//
//	@Summary		Get an event
//	@Description	Get the data for one event from the DB. Available to all users.
//	@Tags			event
//	@Produce		json
//	@Param			id	path		string	true	"Event ID"
//	@Success		200	{object}	[]models.Event
//	@Failure		400
//	@Failure		404
//	@Failure		500
//	@Security		ApiKeyAuth
//	@Router			/events/{id} [get]
func (ctrl EventController) Get(w http.ResponseWriter, r *http.Request) {
	// Get ID of requested event
	id := chi.URLParam(r, "id")

	// Try to convert the given ID into an Object ID
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		log.Error().Err(err).Msg("could not convert url param to object id")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Try to fetch from DB
	event, err := models.GetEvent(r.Context(), bson.M{"_id": objID})

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

	// Return as JSON, fallback if it fails
	if err := render.Render(w, r, &event); err != nil {
		render.Render(w, r, util.ErrRender(err))
		return
	}

	// Write audit info log
	token, err := util.GetUserTokenFromContext(r.Context())
	uid := ""
	if err == nil {
		uid = token.UID
	}
	log.Info().
		Str("type", "audit").
		Str("controller", "event").
		Str("requester_uid", uid).
		Str("action", "getEvent").
		Str("eventId", id).
		Bool("privileged", false).
		Msg("fetched event")
}

// Get event tickets godoc
//
//	@Summary		Get tickets for event
//	@Description	Get every ticket for an event. Only available to admins.
//	@Tags			event
//	@Produce		json
//	@Param			id	path		string	true	"Event ID"
//	@Success		200	{object}	[]models.Ticket
//	@Failure		400
//	@Failure		404
//	@Failure		500
//	@Security		ApiKeyAuth
//	@Router			/events/{id}/tickets [get]
func (ctrl EventController) GetTickets(w http.ResponseWriter, r *http.Request) {
	// Get ID of requested event
	id := chi.URLParam(r, "id")

	// Try to convert the given ID into an Object ID
	eventID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		log.Error().Err(err).Msg("could not convert url param to object id")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Check if event exists
	exists, err := models.CheckIfEventExists(r.Context(), eventID)
	if err != nil {
		log.Error().Err(err).Msg("could not check if event exists")
		render.Render(w, r, util.ErrServer(err))
		return
	}
	if !exists {
		render.Render(w, r, util.ErrNotFound)
		return
	}

	// Fetch list of tickets
	tickets, err := models.GetTickets(r.Context(), bson.M{"event": eventID})
	if err != nil {
		log.Error().Err(err).Msg("could not fetch tickets of event")
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

	// Write audit info log
	token, err := util.GetUserTokenFromContext(r.Context())
	uid := ""
	if err == nil {
		uid = token.UID
	}
	log.Info().
		Str("type", "audit").
		Str("controller", "event").
		Str("requester_uid", uid).
		Str("action", "getEventTickets").
		Str("eventId", id).
		Bool("privileged", true).
		Msg("fetched tickets for event")
}

// Get event ticket count godoc
//
//	@Summary		Get ticket count for event
//	@Description	Get the ticket count for an event. Only available to admins.
//	@Tags			event
//	@Produce		json
//	@Param			id	path		string	true	"Event ID"
//	@Success		200	{object}	int
//	@Failure		400
//	@Failure		404
//	@Failure		500
//	@Security		ApiKeyAuth
//	@Router			/events/{id}/ticket-count [get]
func (ctrl EventController) GetTicketCount(w http.ResponseWriter, r *http.Request) {
	// Get ID of requested event
	id := chi.URLParam(r, "id")

	// Try to convert the given ID into an Object ID
	eventID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		log.Error().Err(err).Msg("could not convert url param to object id")
		render.Render(w, r, util.ErrInvalidRequest(err))
		return
	}

	// Check if event exists
	exists, err := models.CheckIfEventExists(r.Context(), eventID)
	if err != nil {
		log.Error().Err(err).Msg("could not check if event exists")
		render.Render(w, r, util.ErrServer(err))
		return
	}
	if !exists {
		render.Render(w, r, util.ErrNotFound)
		return
	}

	// Fetch list of tickets
	count, err := models.GetTicketCount(r.Context(), bson.M{"event": eventID})
	if err != nil {
		log.Error().Err(err).Msg("could not fetch ticket count for event")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	// Return just as number
	countStr := strconv.FormatInt(count, 10)
	w.Write([]byte(countStr))

	// Write audit info log
	token, err := util.GetUserTokenFromContext(r.Context())
	uid := ""
	if err == nil {
		uid = token.UID
	}
	log.Info().
		Str("type", "audit").
		Str("controller", "event").
		Str("requester_uid", uid).
		Str("action", "getEventTicketCount").
		Str("eventId", id).
		Bool("privileged", true).
		Msg("fetched ticket count for event")
}

// Update event godoc
//
//	@Summary		Update event details
//	@Description	Update the details for an event. Only available to admins.
//	@Tags			event
//	@Produce		json
//	@Param			id	path	string	true	"Event ID"
//	@Param			updates	body	models.Event	true	"Updates to make (not all attributes below are required, and id cannot be changed)"
//	@Success		200
//	@Failure		304
//	@Failure		400
//	@Failure		404
//	@Failure		500
//	@Security		ApiKeyAuth
//	@Router			/events/{id} [patch]
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
	_, err = models.GetEvent(r.Context(), bson.M{"_id": id})
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

	// Write audit info log
	token, err := util.GetUserTokenFromContext(r.Context())
	uid := ""
	if err == nil {
		uid = token.UID
	}
	log.Info().
		Str("type", "audit").
		Str("controller", "event").
		Str("requester_uid", uid).
		Str("action", "updateEvent").
		Str("eventId", id).
		Any("requestedUpdates", requestedUpdates).
		Bool("privileged", true).
		Msg("updated event details")
}

// Delete event godoc
//
//	@Summary		Delete event
//	@Description	Delete event from database. Only available to admins.
//	@Tags			event
//	@Produce		json
//	@Param			id	path		string	true	"Event ID"
//	@Success		200
//	@Failure		400
//	@Failure		404
//	@Failure		500
//	@Security		ApiKeyAuth
//	@Router			/events/{id} [delete]
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
	if err == models.ErrNotFound {
		log.Error().Err(err).Msg("could not find event to delete")
		render.Render(w, r, util.ErrNotFound)
		return
	} else if err != nil {
		log.Error().Err(err).Msg("could not delete event")
		render.Render(w, r, util.ErrServer(err))
		return
	}

	w.WriteHeader(http.StatusOK)

	// Write audit info log
	token, err := util.GetUserTokenFromContext(r.Context())
	uid := ""
	if err == nil {
		uid = token.UID
	}
	log.Info().
		Str("type", "audit").
		Str("controller", "event").
		Str("requester_uid", uid).
		Str("action", "deleteEvent").
		Str("eventId", id).
		Bool("privileged", true).
		Msg("deleted event")
}

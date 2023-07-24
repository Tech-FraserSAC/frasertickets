package models

import (
	"context"
	"net/http"
	"time"

	"github.com/aritrosaha10/frasertickets/lib"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Event struct {
	ID             primitive.ObjectID   `json:"id"              bson:"_id,omitempty"`
	Name           string               `json:"name"            bson:"name"`
	Description    string               `json:"description"     bson:"description"`
	ImageURL       string               `json:"img_url"         bson:"img_url"`
	Location       string               `json:"location"        bson:"location"` // Ex. name of venue
	Address        string               `json:"address"         bson:"address"`
	StartTimestamp time.Time            `json:"start_timestamp" bson:"start_timestamp"`
	EndTimestamp   time.Time            `json:"end_timestamp"   bson:"end_timestamp"`
	Tickets        []primitive.ObjectID `json:"tickets"         bson:"tickets"`
}

func (event *Event) Render(w http.ResponseWriter, r *http.Request) error {
	return nil
}

func GetAllEvents(ctx context.Context) ([]Event, error) {
	// Try to get data from MongoDB
	cursor, err := lib.Datastore.Db.Collection(eventsColName).Find(ctx, bson.D{})
	if err != nil {
		return []Event{}, err
	}

	// Attempt to convert BSON data into Event structs
	var events []Event
	if err := cursor.All(ctx, &events); err != nil {
		return []Event{}, err
	}

	return events, nil
}

func GetEventByKey(ctx context.Context, key string, value interface{}) (Event, error) {
	// Try to fetch data from DB
	var event Event
	err := lib.Datastore.Db.Collection(eventsColName).
		FindOne(ctx, bson.M{key: value}).
		Decode(&event)

	// No error handling needed (user & err will default to empty struct / nil)
	return event, err
}

func CreateNewEvent(ctx context.Context, event Event) (primitive.ObjectID, error) {
	// Make sure it's an empty array, not nil
	event.Tickets = make([]primitive.ObjectID, 0)

	// Try to add document
	res, err := lib.Datastore.Db.Collection(eventsColName).InsertOne(ctx, event)

	// Return object ID
	return res.InsertedID.(primitive.ObjectID), err
}

func UpdateExistingEvent(ctx context.Context, id string, updates map[string]interface{}) error {
	UPDATABLE_KEYS := map[string]bool{
		"name":            true,
		"description":     true,
		"img_url":         true,
		"location":        true,
		"start_timestamp": true,
		"end_timestamp":   true,
	}

	// Convert the string/interface map to BSON updates
	bsonUpdates := bson.D{}
	for key, val := range updates {
		// Don't allow other keys to be updated
		if !UPDATABLE_KEYS[key] {
			return ErrEditNotAllowed
		}

		// Add the key/val pair in BSON
		bsonUpdates = append(bsonUpdates, bson.E{Key: key, Value: val})
	}

	// Try to update document in DB
	res, err := lib.Datastore.Db.Collection(eventsColName).
		UpdateByID(ctx, id, bson.D{{Key: "$set", Value: bsonUpdates}})
	if err != nil {
		return err
	}
	if res.ModifiedCount == 0 {
		return ErrNoDocumentModified
	}
	return nil
}

func DeleteEvent(ctx context.Context, id primitive.ObjectID) error {
	// Check if event exists
	event, err := GetEventByKey(ctx, "_id", id)
	if err != nil {
		return err
	}

	// Delete all tickets to event
	_, err = lib.Datastore.Db.Collection(ticketsColName).
		DeleteMany(ctx, bson.M{"_id": bson.M{"$in": event.Tickets}})
	if err != nil {
		return err
	}

	// Delete event
	res, err := lib.Datastore.Db.Collection(eventsColName).DeleteOne(ctx, bson.M{"_id": id})

	// Handle no document found
	if err == nil {
		if res.DeletedCount == 0 {
			err = ErrNoDocumentModified
		}
	}
	return err
}

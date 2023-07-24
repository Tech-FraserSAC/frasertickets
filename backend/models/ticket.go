package models

import (
	"context"
	"net/http"
	"time"

	"github.com/aritrosaha10/frasertickets/lib"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Ticket struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Owner     string             `json:"ownerID" bson:"owner"` // owner ID
	Event     primitive.ObjectID `json:"eventID" bson:"event"`
	Timestamp time.Time          `json:"timestamp" bson:"timestamp"`
}

func (ticket *Ticket) Render(w http.ResponseWriter, r *http.Request) error {
	return nil
}

func GetTickets(ctx context.Context, filter bson.M) ([]Ticket, error) {
	// Try to get data from MongoDB
	cursor, err := lib.Datastore.Db.Collection(ticketsColName).Find(ctx, filter)
	if err != nil {
		return []Ticket{}, err
	}

	// Attempt to convert BSON data into Ticket structs
	var tickets []Ticket
	if err := cursor.All(ctx, &tickets); err != nil {
		return []Ticket{}, err
	}

	return tickets, nil
}

func SearchForTicket(ctx context.Context, eventID primitive.ObjectID, userID string) (Ticket, error) {
	// Try to get data from DB
	var ticket Ticket
	err := lib.Datastore.Db.Collection(ticketsColName).FindOne(ctx, bson.M{"event": eventID, "owner": userID}).Decode(&ticket)

	// No error handling needed (ticket & err default to empty struct / nil)
	return ticket, err
}

func GetTicket(ctx context.Context, id primitive.ObjectID) (Ticket, error) {
	// Try to get data from DB
	var ticket Ticket
	err := lib.Datastore.Db.Collection(ticketsColName).FindOne(ctx, bson.M{"_id": id}).Decode(&ticket)

	// No error handling needed (ticket & err default to empty struct / nil)
	return ticket, err
}

func CreateNewTicket(ctx context.Context, ticket Ticket) (primitive.ObjectID, error) {
	// Set timestamp to now
	ticket.Timestamp = time.Now()

	// Try to add ticket
	res, err := lib.Datastore.Db.Collection(ticketsColName).InsertOne(ctx, ticket)

	// Return object ID
	return res.InsertedID.(primitive.ObjectID), err
}

func DeleteTicket(ctx context.Context, id primitive.ObjectID) error {
	// Delete ticket
	res, err := lib.Datastore.Db.Collection(ticketsColName).DeleteOne(ctx, bson.M{"_id": id})

	// Handle no document found
	if err == nil {
		if res.DeletedCount == 0 {
			err = ErrNoDocumentModified
		}
	}
	return err
}

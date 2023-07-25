package models

import (
	"context"
	"net/http"
	"time"

	"github.com/aritrosaha10/frasertickets/lib"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Ticket struct {
	ID        primitive.ObjectID `json:"id"        bson:"_id,omitempty"`
	Owner     string             `json:"ownerID"   bson:"owner"` // owner ID
	Event     primitive.ObjectID `json:"eventID"   bson:"event"`
	Timestamp time.Time          `json:"timestamp" bson:"timestamp"`
}

func (ticket *Ticket) Render(w http.ResponseWriter, r *http.Request) error {
	return nil
}

func CreateTicketIndices(ctx context.Context) error {
	// Create appropriate indices
	eventOwnerPairIdxModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "event", Value: 1},
			{Key: "owner", Value: 1},
		},
	}
	eventIdxModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "event", Value: 1},
		},
	}
	ownerIdxModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "owner", Value: 1},
		},
	}

	// Try creating the indices
	opts := options.CreateIndexes().SetMaxTime(10 * time.Second)
	_, err := lib.Datastore.Db.Collection(ticketsColName).
		Indexes().
		CreateMany(
			ctx,
			[]mongo.IndexModel{
				eventOwnerPairIdxModel,
				eventIdxModel,
				ownerIdxModel,
			},
			opts,
		)

	return err
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

func SearchForTicket(
	ctx context.Context,
	eventID primitive.ObjectID,
	userID string,
) (Ticket, error) {
	// Try to get data from DB
	var ticket Ticket
	err := lib.Datastore.Db.Collection(ticketsColName).
		FindOne(ctx, bson.M{"event": eventID, "owner": userID}).
		Decode(&ticket)

	// No error handling needed (ticket & err default to empty struct / nil)
	return ticket, err
}

func GetTicket(ctx context.Context, id primitive.ObjectID) (Ticket, error) {
	// Try to get data from DB
	var ticket Ticket
	err := lib.Datastore.Db.Collection(ticketsColName).
		FindOne(ctx, bson.M{"_id": id}).
		Decode(&ticket)

	// No error handling needed (ticket & err default to empty struct / nil)
	return ticket, err
}

func CheckIfTicketExists(ctx context.Context, filter bson.M) (bool, error) {
	// Directly return results from DB
	count, err := lib.Datastore.Db.Collection(ticketsColName).CountDocuments(ctx, filter)
	return count == 1, err
}

func CreateNewTicket(ctx context.Context, ticket Ticket) (primitive.ObjectID, error) {
	// Set timestamp to now
	ticket.Timestamp = time.Now()

	// Check if ticket already exists
	_, err := SearchForTicket(ctx, ticket.Event, ticket.Owner)
	if err == nil {
		return primitive.NilObjectID, ErrAlreadyExists
	}

	// Check if event exists
	eventExists, err := CheckIfEventExists(ctx, ticket.Event)
	if err != nil {
		return primitive.NilObjectID, err
	}
	if !eventExists {
		return primitive.NilObjectID, ErrNotFound
	}

	// Check if user exists
	userExists, err := CheckIfUserExists(ctx, ticket.Owner)
	if err != nil {
		return primitive.NilObjectID, err
	}
	if !userExists {
		return primitive.NilObjectID, ErrNotFound
	}

	// Try to add ticket
	res, err := lib.Datastore.Db.Collection(ticketsColName).InsertOne(ctx, ticket)
	if err != nil {
		return primitive.NilObjectID, err
	}

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

func DeleteAllTicketsForEvent(ctx context.Context, eventID primitive.ObjectID) error {
	// Delete all tickets to event
	_, err := lib.Datastore.Db.Collection(ticketsColName).DeleteMany(ctx, bson.M{"event": eventID})
	return err
}

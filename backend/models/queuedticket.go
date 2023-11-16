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

type QueuedTicket struct {
	ID             primitive.ObjectID `json:"id"             bson:"_id,omitempty"`
	StudentNumber  string             `json:"student_number" bson:"student_number"`
	EventID        primitive.ObjectID `json:"event_id"       bson:"event_id"`
	Timestamp      time.Time          `json:"timestamp"      bson:"timestamp"`
	MaxScanCount   int                `json:"max_scan_count" bson:"max_scan_count"`
	FullNameUpdate string             `json:"full_name_update" bson:"full_name_update"`
}

func (queuedTicket *QueuedTicket) Render(w http.ResponseWriter, r *http.Request) error {
	return nil
}

func CreateQueuedTicketIndicies(ctx context.Context) error {
	// Create appropriate indices
	queuedTicketStudentNumberModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "student_number", Value: 1},
		},
	}

	// Try creating indices
	opts := options.CreateIndexes().SetMaxTime(10 * time.Second)
	_, err := lib.Datastore.Db.Collection(queuedTicketsColName).
		Indexes().
		CreateMany(
			ctx,
			[]mongo.IndexModel{
				queuedTicketStudentNumberModel,
			},
			opts,
		)

	return err
}

func GetQueuedTicket(ctx context.Context, queuedTicketID primitive.ObjectID) (QueuedTicket, error) {
	res := lib.Datastore.Db.Collection(queuedTicketsColName).FindOne(ctx, bson.M{"_id": queuedTicketID})
	if res.Err() != nil {
		return QueuedTicket{}, res.Err()
	}

	var queuedTicket QueuedTicket
	if err := res.Decode(&queuedTicket); err != nil {
		return QueuedTicket{}, err
	}

	return queuedTicket, nil
}

func GetQueuedTicketsForStudentNumber(ctx context.Context, studentNumber string) ([]QueuedTicket, error) {
	cursor, err := lib.Datastore.Db.Collection(queuedTicketsColName).Find(ctx, bson.M{"_id": studentNumber})
	if err != nil {
		return []QueuedTicket{}, err
	}
	defer cursor.Close(ctx)

	// Attempt to decode BSON into structs
	var queuedTickets []QueuedTicket
	if err := cursor.All(ctx, &queuedTickets); err != nil {
		return []QueuedTicket{}, err
	}

	return queuedTickets, nil
}

func CreateQueuedTicket(ctx context.Context, queuedTicket QueuedTicket) (primitive.ObjectID, error) {
	queuedTicket.Timestamp = time.Now()

	// Check if ticket already exists
	exists, err := CheckIfQueuedTicketExists(ctx, bson.M{
		"student_number": queuedTicket.StudentNumber,
		"event_id":       queuedTicket.EventID,
	})
	if err != nil {
		return primitive.NilObjectID, err
	}
	if exists {
		return primitive.NilObjectID, ErrAlreadyExists
	}

	// Check if event exists
	eventExists, err := CheckIfEventExists(ctx, queuedTicket.EventID)
	if err != nil {
		return primitive.NilObjectID, err
	}
	if !eventExists {
		return primitive.NilObjectID, ErrNotFound
	}

	// Try to add ticket
	res, err := lib.Datastore.Db.Collection(queuedTicketsColName).InsertOne(ctx, queuedTicket)
	if err != nil {
		return primitive.NilObjectID, err
	}

	// Return object ID
	return res.InsertedID.(primitive.ObjectID), err
}

func ConvertQueuedTicketToTicket(ctx context.Context, queuedTicket QueuedTicket, applyFullNameUpdate bool) (Ticket, error) {
	user, err := GetUserByKey(ctx, "student_number", queuedTicket.StudentNumber)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return Ticket{}, ErrNotFound
		}
		return Ticket{}, err
	}

	if _, err := CheckIfEventExists(ctx, queuedTicket.EventID); err != nil {
		return Ticket{}, err
	}

	ticket := Ticket{
		Owner:        user.ID,
		Event:        queuedTicket.EventID,
		Timestamp:    time.Now(),
		ScanCount:    0,
		MaxScanCount: queuedTicket.MaxScanCount,
	}

	ticketId, err := CreateNewTicket(ctx, ticket)
	if err != nil {
		return Ticket{}, err
	}

	ticket.ID = ticketId

	// Try updating full name if requested
	if applyFullNameUpdate && queuedTicket.FullNameUpdate != "" {
		UpdateExistingUserByKeys(ctx, user.ID, map[string]interface{}{
			"full_name": queuedTicket.FullNameUpdate,
		})
	}

	// Delete queued ticket since it has already been converted
	// No point in doing much with the error from this,
	// if it doesn't succeed, should still return new ticket
	DeleteQueuedTicket(ctx, queuedTicket.ID)

	return ticket, nil
}

func CheckIfQueuedTicketExists(ctx context.Context, filter bson.M) (bool, error) {
	// Directly return DB results
	count, err := lib.Datastore.Db.Collection(queuedTicketsColName).CountDocuments(ctx, filter)
	return count > 0, err
}

func DeleteQueuedTicket(ctx context.Context, id primitive.ObjectID) error {
	// Delete queued ticket
	res, err := lib.Datastore.Db.Collection(queuedTicketsColName).DeleteOne(ctx, bson.M{"_id": id})

	// Handle no document found
	if err == nil {
		if res.DeletedCount == 0 {
			err = ErrNoDocumentModified
		}
	}
	return err
}

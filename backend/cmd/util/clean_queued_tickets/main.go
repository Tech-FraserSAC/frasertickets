package main

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/aritrosaha10/frasertickets/lib"
	"github.com/aritrosaha10/frasertickets/models"
	"github.com/aritrosaha10/frasertickets/util"
	"github.com/joho/godotenv"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func main() {
	// Just assume we're running in dev
	godotenv.Load(".env.development")

	// Create new auth & DB refs
	lib.Auth = lib.CreateNewAuth()
	lib.Datastore = lib.CreateNewDB()
	lib.Datastore.Connect()
	defer lib.Datastore.Disconnect()

	ctx := context.Background()

	// Start logging
	util.ConfigureZeroLog()

	queuedTickets, err := models.GetAllQueuedTickets(ctx)
	if err != nil {
		log.Fatal().Err(err).Msg("could not fetch all queued tickets")
	}

	startTime := time.Now()
	var waitGroup sync.WaitGroup
	var successfulDeletions atomic.Uint64
	var delayedDeletions atomic.Uint64
	var failedDeletions atomic.Uint64
	for _, queuedTicket := range queuedTickets {
		waitGroup.Add(1)
		// Check if ticket exists, if it does, delete old queued ticket
		go func(queuedTicket models.QueuedTicket) {
			defer waitGroup.Done()

			user, err := models.GetUserByKey(ctx, "student_number", queuedTicket.StudentNumber)
			if err != nil {
				if err == mongo.ErrNoDocuments {
					log.Info().Err(err).Str("studentNumber", queuedTicket.StudentNumber).Msg("no user with given student # exists yet")
					delayedDeletions.Add(1)
					return
				}
				log.Warn().Err(err).Str("studentNumber", queuedTicket.StudentNumber).Msg("could not check if user with student # exists")
				failedDeletions.Add(1)
				return
			}

			if ticketExists, err := models.CheckIfTicketExists(ctx, bson.M{"owner": user.ID, "event": queuedTicket.EventID}); err != nil {
				log.Warn().Err(err).Any("queuedTicket", queuedTicket).Msg("could not check for ticket existing")
				failedDeletions.Add(1)
				return
			} else if !ticketExists {
				return
			}

			if err = models.DeleteQueuedTicket(ctx, queuedTicket.ID); err != nil {
				log.Warn().Err(err).Any("queuedTicket", queuedTicket).Msg("could not delete old queued ticket")
				failedDeletions.Add(1)
				return
			}
			log.Info().Any("queuedTicket", queuedTicket).Msg("deleted old queued ticket")
			successfulDeletions.Add(1)
		}(queuedTicket)
	}

	waitGroup.Wait()
	endTime := time.Now()

	fmt.Printf("successfully created tickets in %d ms\n", endTime.Sub(startTime).Milliseconds())
	fmt.Printf("successful ticket deletions: %d\n", successfulDeletions.Load())
	fmt.Printf("delayed ticket deletions: %d\n", delayedDeletions.Load())
	fmt.Printf("failed ticket deletions: %d\n", failedDeletions.Load())
}

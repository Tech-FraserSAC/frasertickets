package main

import (
	"context"
	"encoding/csv"
	"flag"
	"fmt"
	"io"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/aritrosaha10/frasertickets/lib"
	"github.com/aritrosaha10/frasertickets/models"
	"github.com/aritrosaha10/frasertickets/util"
	"github.com/joho/godotenv"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func usage() {
	fmt.Fprintf(os.Stderr, "usage: %s [EVENT ID] [CSV FILENAME]\n", os.Args[0])
	flag.PrintDefaults()
	os.Exit(2)
}

func main() {
	// Just assume we're running in dev
	godotenv.Load(".env.development")

	flag.Usage = usage
	flag.Parse()

	args := flag.Args()
	if len(args) < 2 {
		usage()
	}

	// Create new auth & DB refs
	lib.Auth = lib.CreateNewAuth()
	lib.Datastore = lib.CreateNewDB()
	lib.Datastore.Connect()
	defer lib.Datastore.Disconnect()

	ctx := context.Background()

	// Start logging
	util.ConfigureZeroLog()

	rawEventID := args[0]
	csvFilename := args[1]

	// Start working with command-line arguments
	eventID, err := primitive.ObjectIDFromHex(rawEventID)
	if err != nil {
		log.Fatal().Err(err).Msg("could not parse event id")
	}

	f, err := os.Open(csvFilename)
	if err != nil {
		log.Fatal().Err(err).Msg("could not open csv")
	}
	defer f.Close()

	csvReader := csv.NewReader(f)

	// Read first line to get more information about spreadsheet
	_, err = csvReader.Read()
	if err != nil {
		if err == io.EOF {
			log.Fatal().Msg("csv is empty")
		} else {
			log.Fatal().Err(err).Msg("could not parse csv")
		}
	}
	if csvReader.FieldsPerRecord == 0 {
		log.Fatal().Msg("csv has no cols")
	}

	// Account for carriage return in Window's enter key
	var pltScn string
	if runtime.GOOS == "windows" {
		pltScn = "\n"
	}

	// Get important information about spreadsheet from user
	var studentNameColNum int
	fmt.Printf("What column # stores student names (assumed to be in format 'Last Name, First Name') [1-%d]? ", csvReader.FieldsPerRecord)
	if n, err := fmt.Scanf("%d"+pltScn, &studentNameColNum); err != nil || n != 1 {
		log.Fatal().Err(err).Msg("could not parse col #")
	}
	if studentNameColNum < 1 || studentNameColNum > int(csvReader.FieldsPerRecord) {
		log.Fatal().Msg("column # given is outside accepted range")
	}
	studentNameColNum-- // Move to 0-based index

	var studentNumberColNum int
	fmt.Printf("What column # stores student numbers [1-%d]? ", csvReader.FieldsPerRecord)
	if n, err := fmt.Scanf("%d"+pltScn, &studentNumberColNum); err != nil || n != 1 {
		log.Fatal().Err(err).Msg("could not parse col #")
	}
	if studentNumberColNum < 1 || studentNumberColNum > int(csvReader.FieldsPerRecord) {
		log.Fatal().Msg("column # given is outside accepted range")
	}
	studentNumberColNum-- // Move to 0-based index

	var localMaxScanCountColNum int // -1 -> no given column number
	fmt.Printf("What column # stores the maximum scan count for a ticket? [1-%d, 0 for none]? ", csvReader.FieldsPerRecord)
	if n, err := fmt.Scanf("%d"+pltScn, &localMaxScanCountColNum); err != nil || n != 1 {
		log.Fatal().Err(err).Msg("could not parse local max scan count")
	}
	if localMaxScanCountColNum < 0 || localMaxScanCountColNum > int(csvReader.FieldsPerRecord) {
		log.Fatal().Msg("column # given is outside accepted range")
	}
	localMaxScanCountColNum-- // Move to 0-based index

	var globalMaxScanCount int
	fmt.Printf("What should the default maximum scan count be per ticket [>=0, 0 for infinite]? ")
	if n, err := fmt.Scanf("%d"+pltScn, &globalMaxScanCount); err != nil || n != 1 {
		log.Fatal().Err(err).Msg("could not parse global max scan count")
	}
	if globalMaxScanCount < 0 {
		log.Fatal().Msg("global max scan count below 0")
	}

	startTime := time.Now()
	var waitGroup sync.WaitGroup
	var successfulConversions atomic.Uint64
	var delayedConversions atomic.Uint64
	var failedConversions atomic.Uint64
	for {
		rec, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Fatal().Err(err).Msg("could not parse csv")
		}

		// Increment WaitGroup counter
		waitGroup.Add(1)
		go func(rec []string) {
			// Decrement counter on goroutine completion
			defer waitGroup.Done()

			// Parse spreadsheet data
			rawFullName := rec[studentNameColNum]
			studentNumber := rec[studentNumberColNum]

			maxScanCount := globalMaxScanCount
			// Try parsing the local max scan count from DB if column
			// number exists, otherwise defaulting to global
			if localMaxScanCountColNum != -1 {
				tmpScanCount, err := strconv.Atoi(rec[localMaxScanCountColNum])
				if err != nil {
					log.Warn().Err(err).Str("rawLocalMaxScanCount", rec[localMaxScanCountColNum]).Msg("could not parse local max scan count")
				} else {
					maxScanCount = tmpScanCount
				}
			}

			nameSplit := strings.Split(rawFullName, ", ")
			if len(nameSplit) != 2 {
				err := fmt.Errorf("more than one comma in name: %s", rawFullName)
				log.Error().Err(err).Str("rawFullName", rawFullName).Msg("could not parse full name")
				failedConversions.Add(1)
				return
			}
			fullName := fmt.Sprintf("%s %s", nameSplit[1], nameSplit[0])

			// Create queued ticket in DB
			queuedTicket := models.QueuedTicket{
				StudentNumber:  studentNumber,
				EventID:        eventID,
				MaxScanCount:   maxScanCount,
				FullNameUpdate: fullName,
				CustomFields:   map[string]interface{}{}, // TODO: Adjust program to support custom fields
			}

			queuedTicketID, err := models.CreateQueuedTicket(ctx, queuedTicket)
			if err != nil {
				log.Error().Err(err).Any("queuedTicket", queuedTicket).Msg("could not make queued ticket")
				failedConversions.Add(1)
				return
			}
			queuedTicket.ID = queuedTicketID

			// Try converting queued ticket, if it fails, still exists in DB for later
			ticket, err := models.ConvertQueuedTicketToTicket(ctx, queuedTicket, true)
			if err != nil {
				if err == models.ErrNotFound {
					log.Info().Any("queuedTicket", queuedTicket).Msg("user does not yet exist in DB, keeping queued ticket")
					delayedConversions.Add(1)
				} else {
					log.Error().Err(err).Any("queuedTicket", queuedTicket).Msg("could not convert ticket to queued ticket")
					failedConversions.Add(1)
				}
				return
			}

			log.Info().Any("ticket", ticket).Str("owner_uid", ticket.Owner).Msg("successfully made ticket")
			successfulConversions.Add(1)
		}(rec)
	}
	waitGroup.Wait()
	endTime := time.Now()

	fmt.Printf("successfully created tickets in %d ms\n", endTime.Sub(startTime).Milliseconds())
	fmt.Printf("successful ticket conversions: %d\n", successfulConversions.Load())
	fmt.Printf("delayed ticket conversions (will be added once user signs up): %d\n", delayedConversions.Load())
	fmt.Printf("failed ticket conversions: %d\n", failedConversions.Load())
}

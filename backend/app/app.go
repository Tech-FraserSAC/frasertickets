package app

import (
	"context"
	"net/http"
	"os"

	"github.com/aritrosaha10/frasertickets/config"
	"github.com/aritrosaha10/frasertickets/lib"
	"github.com/aritrosaha10/frasertickets/models"
	"github.com/aritrosaha10/frasertickets/util"
	"github.com/joho/godotenv"
	"github.com/rs/zerolog/log"
)

func Run() {
	// Load in environment file according to environment
	env := os.Getenv("FRASERTICKETS_ENV")
	if env == "" {
		env = "development"
	}
	godotenv.Load(".env." + env)

	// Set up logging
	util.ConfigureZeroLog()

	// Set up datastore
	ds := lib.CreateNewDB()
	ds.Connect()
	log.Debug().Msg("connected to database")
	defer ds.Disconnect()
	lib.Datastore = ds

	// Set up authentication
	auth := lib.CreateNewAuth()
	lib.Auth = auth
	log.Debug().Msg("connected to auth server")

	// Set up authentication
	cloudStorage := lib.CreateNewStorage()
	lib.CloudStorage = cloudStorage
	log.Debug().Msg("connected to cloud storage")

	// Initialize all indices on the database
	err := models.CreateTicketIndices(context.Background())
	if err != nil {
		log.Fatal().Err(err).Msg("could not set up ticket indices")
	}
	log.Debug().Msg("created ticket indices")

	err = models.CreateUserIndices(context.Background())
	if err != nil {
		log.Fatal().Err(err).Msg("could not set up user indices")
	}
	log.Debug().Msg("created user indices")

	err = models.CreateQueuedTicketIndices(context.Background())
	if err != nil {
		log.Fatal().Err(err).Msg("could not set up queued ticket indices")
	}
	log.Debug().Msg("created queued ticket indices")

	// Set up server
	s := config.CreateNewServer()
	s.MountHandlers()
	config.Serv = s

	log.Info().Str("port", s.Port).Str("env", env).Msg("server now listening for requests")
	log.Fatal().Err(http.ListenAndServe(":"+s.Port, s.Router)).Send()
}

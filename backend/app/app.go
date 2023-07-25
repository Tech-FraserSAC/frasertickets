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
	defer ds.Disconnect()
	lib.Datastore = ds

	// Set up authentication
	auth := lib.CreateNewAuth()
	lib.Auth = auth

	// Initialize all indices on the database
	err := models.CreateTicketIndices(context.Background())
	if err != nil {
		log.Warn().Err(err).Msg("could not set up ticket indices")
	}
	err = models.CreateUserIndices(context.Background())
	if err != nil {
		log.Warn().Err(err).Msg("could not set up user indices")
	}

	// Set up server
	s := config.CreateNewServer()
	s.MountHandlers()
	config.Serv = s

	http.ListenAndServe(":"+s.Port, s.Router)
}

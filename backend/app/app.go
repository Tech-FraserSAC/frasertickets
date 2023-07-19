package app

import (
	"log"
	"net/http"
	"os"

	"github.com/aritrosaha10/frasertickets/config"
	"github.com/aritrosaha10/frasertickets/lib"
	"github.com/joho/godotenv"
)

func Run() {
	// Load in environment file according to environment
	env := os.Getenv("FRASERTICKETS_ENV")
	if env == "" {
		env = "development"
	}
	godotenv.Load(".env." + env)

	// Set up datastore
	ds := lib.CreateNewDB()
	ds.Connect()
	defer ds.Disconnect()
	lib.Datastore = ds

	// Set up server
	s := config.CreateNewServer()
	s.MountHandlers()
	config.Serv = s

	log.Fatal(http.ListenAndServe(":"+s.Port, s.Router))
}

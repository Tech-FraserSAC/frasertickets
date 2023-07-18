package app

import (
	"net/http"
	"os"

	"github.com/aritrosaha10/frasertickets/config"
	"github.com/joho/godotenv"
)

func Run() {
	// Load in environment file according to environment
	env := os.Getenv("FRASERTICKETS_ENV")
	if env == "" {
		env = "development"
	}
	godotenv.Load(".env." + env)

	// Set up server
	serv := config.CreateNewServer()
	serv.MountHandlers()
	http.ListenAndServe(":"+serv.Port, serv.Router)
}

package lib

import (
	"context"
	"encoding/json"
	"os"

	firebase "firebase.google.com/go"
	"firebase.google.com/go/auth"
	"github.com/rs/zerolog/log"
	"google.golang.org/api/option"
)

var (
	Auth *IdentityPlatformAuth
)

type IdentityPlatformAuth struct {
	app    *firebase.App
	Client *auth.Client

	credentials option.ClientOption
}

func CreateNewAuth() *IdentityPlatformAuth {
	auth := &IdentityPlatformAuth{}

	if os.Getenv("FRASERTICKETS_ENV") == "development" {
		// Import and format credentials from env to JSON
		firebaseCreds := map[string]string{
			"type":                        "service_account",
			"project_id":                  os.Getenv("FIREBASE_PROJECT_ID"),
			"private_key_id":              os.Getenv("FIREBASE_PRIVATE_KEY_ID"),
			"private_key":                 os.Getenv("FIREBASE_PRIVATE_KEY"),
			"client_email":                os.Getenv("FIREBASE_CLIENT_EMAIL"),
			"client_id":                   os.Getenv("FIREBASE_CLIENT_ID"),
			"auth_uri":                    "https://accounts.google.com/o/oauth2/auth",
			"token_uri":                   "https://oauth2.googleapis.com/token",
			"auth_provider_x509_cert_url": os.Getenv("FIREBASE_AUTH_PROVIDER_CERT_URL"),
			"client_x509_cert_url":        os.Getenv("FIREBASE_CLIENT_CERT_URL"),
			"universe_domain":             "googleapis.com",
		}
		serviceAccountJSON, err := json.Marshal(firebaseCreds)
		if err != nil {
			log.Fatal().Err(err).Msg("could not marshal firebase creds from env")
		}
		auth.credentials = option.WithCredentialsJSON(serviceAccountJSON)
	}

	// Initialize Firebase app
	fbApp, err := firebase.NewApp(context.Background(), nil, auth.credentials)
	if err != nil {
		log.Fatal().Err(err).Msg("could not initialize firebase app")
	}
	auth.app = fbApp

	// Initialize Identity Platform
	idPlat, err := fbApp.Auth(context.Background())
	if err != nil {
		log.Fatal().Err(err).Msg("could not initialize identity platform")
	}
	auth.Client = idPlat

	return auth
}

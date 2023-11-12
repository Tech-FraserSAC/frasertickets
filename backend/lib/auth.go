package lib

import (
	"context"

	firebase "firebase.google.com/go"
	"firebase.google.com/go/auth"
	"github.com/aritrosaha10/frasertickets/util"
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

	serviceAccountCreds, err := util.PrepareGCPCredentialsFromEnv()
	if err != nil && err.Error() != "could not find FIREBASE_PROJECT_ID in env" {
		log.Fatal().Err(err).Msg("could not marshal firebase creds from env")
	} else {
		auth.credentials = serviceAccountCreds
	}

	// Initialize Firebase app
	var fbApp *firebase.App
	if auth.credentials != nil {
		fbApp, err = firebase.NewApp(context.Background(), nil, auth.credentials)
	} else {
		// Try initializing using ADC
		fbApp, err = firebase.NewApp(context.Background(), nil)
	}

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

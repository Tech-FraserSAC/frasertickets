package util

import (
	"context"
	"os"
	"time"

	zlg "github.com/mark-ignacio/zerolog-gcp"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/rs/zerolog/pkgerrors"
)

func ConfigureZeroLog() {
	zerolog.SetGlobalLevel(zerolog.DebugLevel)
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	zerolog.ErrorStackMarshaler = pkgerrors.MarshalStack

	env := os.Getenv("FRASERTICKETS_ENV")
	if env == "" {
		log.Fatal().Msg("no environment provided")
	}

	if env == "development" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339})
	} else if env == "production" {
		gcpProjID := os.Getenv("FIREBASE_PROJECT_ID")
		if gcpProjID == "" {
			log.Fatal().Msg("no gcp project id provided")
		}
		gcpLogID := os.Getenv("GCP_LOG_ID")
		if env == "" {
			log.Fatal().Msg("no gcp log id provided")
		}

		gcpWriter, err := zlg.NewCloudLoggingWriter(context.Background(), gcpProjID, gcpLogID, zlg.CloudLoggingOptions{})
		if err != nil {
			log.Panic().Err(err).Msg("could not create CloudLoggingWriter")
		}
		log.Logger = log.Output(zerolog.MultiLevelWriter(
			zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339, NoColor: true},
			gcpWriter,
		))
		defer zlg.Flush()
	}
}

package middleware

import (
	"time"

	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
	"github.com/rs/zerolog/log"
)

func CreateNewSentryMiddleware() *sentryhttp.Handler {
	// Init Sentry first
	if err := sentry.Init(sentry.ClientOptions{
		Dsn:           "https://1e36660a7a5e022a8f602034da95eca7@o4506142641356800.ingest.sentry.io/4506142665277440",
		EnableTracing: true,
		// Set TracesSampleRate to 1.0 to capture 100%
		// of transactions for performance monitoring.
		// We recommend adjusting this value in production,
		TracesSampleRate: 0.3,
	}); err != nil {
		log.Error().Err(err).Msg("Sentry initialization failed")
	}
	defer sentry.Flush(time.Second)

	return sentryhttp.New(sentryhttp.Options{
		Repanic: true,
	})
}

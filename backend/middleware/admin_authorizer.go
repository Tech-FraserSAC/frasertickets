package middleware

import (
	"net/http"

	"github.com/aritrosaha10/frasertickets/util"
	"github.com/go-chi/render"
	"github.com/rs/zerolog/log"
)

func AdminAuthorizerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		isAdmin, err := util.CheckIfAdmin(r.Context())
		if err != nil {
			log.Error().Err(err).Msg("could not check authorization status")
			render.Render(w, r, util.ErrServer(err))
			return
		}

		if !isAdmin {
			idToken, err := util.GetUserTokenFromContext(r.Context())
			if err != nil {
				log.Error().Err(err).Msg("could not fetch user token from context")
			}

			log.Warn().Str("uid", idToken.UID).Msg("unauthorized user attempting to access admin-only route")
			render.Render(w, r, util.ErrForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}

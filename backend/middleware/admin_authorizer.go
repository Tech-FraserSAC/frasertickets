package middleware

import (
	"net/http"

	"github.com/aritrosaha10/frasertickets/lib"
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

		idToken, err := util.GetUserTokenFromContext(r.Context())
		if err != nil {
			log.Error().Err(err).Msg("could not fetch user token from context")
		}

		jwtToken, err := util.GetUserJWTTokenFromContext(r.Context())
		if err != nil {
			log.Error().Err(err).Msg("could not fetch user token from context")
		}

		// We no longer check for revocation in normal authentication since it's not really worth it
		// (everything is read-only for regular users anyways) and as such, isn't worth the time penalty.
		// However, it does make sense for admins since they have full write access to all models.
		_, err = lib.Auth.Client.VerifyIDTokenAndCheckRevoked(r.Context(), jwtToken)
		if err != nil {
			log.Error().Err(err).Any("uid", idToken.UID).Str("token", jwtToken).Msg("could not confirm token is correct")
			render.Render(w, r, util.ErrUnauthorized)
			return
		}

		if !isAdmin {
			log.Warn().Str("uid", idToken.UID).Msg("unauthorized user attempting to access admin-only route")
			render.Render(w, r, util.ErrForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}

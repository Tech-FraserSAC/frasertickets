package middleware

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/aritrosaha10/frasertickets/lib"
	"github.com/aritrosaha10/frasertickets/util"
	"github.com/go-chi/render"
)

func AuthenticatorMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			render.Render(w, r, util.ErrUnauthorized)
			return
		}

		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			err := errors.New("token is not in correct format")
			render.Render(w, r, util.ErrInvalidRequest(err))
			return
		}

		token := tokenParts[1]
		ctx := r.Context()

		decodedToken, err := lib.Auth.Client.VerifyIDToken(ctx, token)
		if err != nil {
			render.Render(w, r, util.ErrUnauthorized)
			return
		}

		// Attach user token to request context
		ctx = context.WithValue(ctx, util.ContextKeyUserToken, decodedToken)
		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)
	})
}

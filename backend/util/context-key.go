package util

import (
	"context"

	"firebase.google.com/go/auth"
)

type contextKey string

func (c contextKey) String() string {
	return string(c)
}

var (
	ContextKeyUserToken = contextKey("userToken")
)

// GetUserTokenFromContext gets the user token from the context.
func GetUserTokenFromContext(ctx context.Context) (*auth.Token, bool) {
	userToken, ok := ctx.Value(ContextKeyUserToken).(*auth.Token)
	return userToken, ok
}

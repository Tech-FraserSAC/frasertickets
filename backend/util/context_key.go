package util

import (
	"context"
	"fmt"

	"firebase.google.com/go/auth"
)

type contextKey string

func (c contextKey) String() string {
	return string(c)
}

var (
	ContextKeyUserToken    = contextKey("userToken")
	ContextKeyUserTokenJWT = contextKey("userTokenJWT")
)

// GetUserTokenFromContext gets the user token from context.
func GetUserTokenFromContext(ctx context.Context) (*auth.Token, error) {
	userToken, ok := ctx.Value(ContextKeyUserToken).(*auth.Token)
	if !ok {
		return nil, fmt.Errorf("could not get user token from context")
	}
	return userToken, nil
}

// GetUserJWTTokenFromContext gets the user's JWT token from context.
func GetUserJWTTokenFromContext(ctx context.Context) (string, error) {
	userToken, ok := ctx.Value(ContextKeyUserTokenJWT).(string)
	if !ok {
		return "", fmt.Errorf("could not get user JWT token from context")
	}
	return userToken, nil
}

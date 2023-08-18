package util

import "context"

func CheckIfAdmin(ctx context.Context) (bool, error) {
	// Check if they are authorized to use endpoint (admin or ticket owner)
	// This runs after the data fetch process so we can grab the ticket owner UID
	idToken, err := GetUserTokenFromContext(ctx)
	if err != nil {
		return false, err
	}

	// Check claims for admin data
	claims := idToken.Claims
	isAdmin := false
	if adminRaw, ok := claims["admin"]; ok {
		isAdmin = adminRaw.(bool)
	}

	return isAdmin, nil
}

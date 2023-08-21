import sendBackendRequest from "../sendBackendRequest";

export default async function addUser() {
    await sendBackendRequest(
        `/users/add`, 
        'post',
        true,
        undefined,
        undefined,
        {
            validateStatus: status => status === 200 || status === 403
        }
    )
}
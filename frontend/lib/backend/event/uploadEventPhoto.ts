import sendBackendRequest from "@/lib/backend/sendBackendRequest";

export default async function uploadEventPhoto(photo: File) {
    const formData = new FormData();
    formData.append("image", photo);
    console.log(formData);

    const res = await sendBackendRequest(`/events/upload-photo`, "post", true, true, formData);
    if (res.status !== 200) {
        throw (res.status, res.data);
    }
    return res.data as string;
}

type User = {
    id: string,
    admin: boolean,
    student_number: string,
    full_name: string,
    pfp_url: string
}

export function convertToUser(rawData: { [key: string]: any }): User {
    return {
        id: rawData.id,
        admin: Boolean(rawData.admin),
        student_number: rawData.student_number,
        full_name: rawData.full_name,
        pfp_url: rawData.pfp_url
    }
}

export default User
import Layout from "@/components/admin/Layout";
import getAllTickets from "@/lib/backend/ticket/getAllTickets";
import TicketWithUserAndEventData from "@/lib/backend/ticket/ticketWithUserAndEventData";
import getAllUsers from "@/lib/backend/user/getAllUsers";
import checkIfTeacher from "@/util/checkIfTeacher";
import { cleanDisplayNameWithStudentNumber } from "@/util/cleanDisplayName";
import cleanDisplayName from "@/util/cleanDisplayName";
import { Typography } from "@material-tailwind/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "react-query";

import { AgGridReact } from 'ag-grid-react'; // the AG Grid React Component

import 'ag-grid-community/styles/ag-grid.css'; // Core grid CSS, always needed
import 'ag-grid-community/styles/ag-theme-alpine.css'; // Optional theme CSS
import { ColDef } from "ag-grid-community";

const ProfilePictureCellRenderer = (props: any) => {
    return (
        <div className="w-full h-full flex items-center">
            <Image
                src={props.value}
                alt="pfp"
                height={30}
                width={30}
                className="rounded-full"
                quality={100}
                unoptimized
            />
        </div>
    )
}

export default function UserTablePage() {
    const { isLoading, error, data: users } = useQuery('frasertix-admin-users', async () => {
        const rawUsers = await getAllUsers()
        return rawUsers.map(user => ({
            pfp_url: user.pfp_url,
            full_name: user.full_name,
            student_number: user.student_number,
            admin: user.admin,
        }))
    })

    const [columnDefs, setColumnDefs] = useState<ColDef[]>([
        {
            field: "pfp_url",
            headerName: "",
            cellRenderer: ProfilePictureCellRenderer,
            width: 75,
            filter: false,
            sortable: false,
            flex: 0
        },
        {
            field: "full_name",
            headerName: "Full Name",
            valueFormatter: (params: any) => (
                cleanDisplayNameWithStudentNumber(
                    params.data.full_name,
                    params.data.student_number
                )
            )
        },
        {
            field: "student_number",
            headerName: "Student #",
            comparator: (a, b, nodeA, nodeB, isDesc) => {
                const numA = Number(a.replace(/\D/g,''))
                const numB = Number(b.replace(/\D/g,''))
                if (Number.isNaN(numA) || Number.isNaN(numB)) {
                    return 0;
                }

                return numA - numB
            }
        },
        {
            field: "admin",
            headerName: "Admin?",
        },
    ])

    const defaultColDef: ColDef = {
        sortable: true,
        filter: true,
        flex: 1,
        rowDrag: false,
        lockVisible: true,
    }

    return (
        <Layout name="Users" className="p-4 md:p-8 lg:px-12">
            <Typography variant="h1" className="text-center mb-4">Users</Typography>
            <div className="overflow-x-auto w-full">
                <div className="ag-theme-alpine" style={{ width: "100%", height: "68vh" }}>
                    <AgGridReact
                        rowData={users}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        animateRows={true}
                        rowSelection="multiple"
                    />
                </div>
            </div>
        </Layout>
    )
}
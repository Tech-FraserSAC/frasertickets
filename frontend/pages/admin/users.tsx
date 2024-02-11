// Optional theme CSS
import editUser from "@/lib/backend/user/editUser";
import getAllUsers from "@/lib/backend/user/getAllUsers";
import { cleanDisplayNameWithStudentNumber } from "@/util/cleanDisplayName";
import { Typography } from "@material-tailwind/react";
// the AG Grid React Component
import { ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
// Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css";
import { AgGridReact } from "ag-grid-react";
import Image from "next/image";
import { useState } from "react";
import { useMutation, useQuery } from "react-query";

import Layout from "@/components/admin/Layout";

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
    );
};

export default function UserTablePage() {
    const {
        isLoading,
        error,
        data: users,
        refetch: refetchUsers,
    } = useQuery("frasertix-admin-users", () => getAllUsers());

    const updateFullNameMutation = useMutation(
        ({ userId, newFullName }: { userId: string; newFullName: string }) => {
            if (newFullName.trim() === "") {
                alert("Please provide a non-empty name.");
                throw "New name is empty";
            }

            return editUser(userId, { full_name: newFullName });
        },
        {
            onSuccess: () => {
                return refetchUsers();
            },
        },
    );

    const columnDefs: ColDef[] = [
        {
            field: "pfp_url",
            headerName: "",
            cellRenderer: ProfilePictureCellRenderer,
            width: 75,
            filter: false,
            sortable: false,
            flex: 0,
        },
        {
            field: "full_name",
            headerName: "Full Name",
            valueFormatter: (params: any) =>
                cleanDisplayNameWithStudentNumber(params.data.full_name, params.data.student_number),
            editable: true,
            valueGetter: (params) => params.data.full_name,
            valueSetter: (params) => {
                try {
                    updateFullNameMutation.mutate({
                        userId: params.data.id,
                        newFullName: params.newValue,
                    });
                    return true;
                } catch (e) {
                    console.error(e);
                    return false;
                }
            },
        },
        {
            field: "student_number",
            headerName: "Student #",
            comparator: (a, b, nodeA, nodeB, isDesc) => {
                const numA = Number(a.replace(/\D/g, ""));
                const numB = Number(b.replace(/\D/g, ""));
                if (Number.isNaN(numA) || Number.isNaN(numB)) {
                    return 0;
                }

                return numA - numB;
            },
        },
        {
            field: "admin",
            headerName: "Admin?",
        },
    ];

    const defaultColDef: ColDef = {
        sortable: true,
        filter: true,
        flex: 1,
        rowDrag: false,
        lockVisible: true,
        resizable: true,
    };

    return (
        <Layout
            name="Users"
            className="p-4 md:p-8 lg:px-12"
        >
            <Typography
                variant="h1"
                className="text-center mb-4"
            >
                Users
            </Typography>
            <div className="overflow-x-auto w-full">
                <div
                    className="ag-theme-alpine"
                    style={{ width: "100%", height: "68vh" }}
                >
                    <AgGridReact
                        rowData={users}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        animateRows={true}
                        rowSelection="multiple"
                        gridOptions={{
                            suppressScrollOnNewData: true,
                            getRowId: (params) => params.data.id,
                        }}
                    />
                </div>
            </div>
        </Layout>
    );
}

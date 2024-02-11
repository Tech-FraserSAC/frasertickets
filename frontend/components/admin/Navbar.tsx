import DefaultAvatar from "@/assets/default-avatar.jpg";
import {
    ArrowRightOnRectangleIcon,
    Bars2Icon,
    ChevronDownIcon,
    QrCodeIcon,
    QueueListIcon,
    TicketIcon,
    UserIcon,
    UsersIcon,
} from "@heroicons/react/24/outline";
import {
    Button,
    Collapse,
    IconButton,
    Menu,
    MenuHandler,
    MenuItem,
    MenuList,
    Navbar,
    Typography,
} from "@material-tailwind/react";
import Image from "next/image";
import Link from "next/link";
import router from "next/router";
import { createElement, useEffect, useState } from "react";

import logOut from "@/util/logOut";

import { useFirebaseAuth } from "../FirebaseAuthContext";

// profile menu component
const profileMenuItems = [
    {
        label: "Enter User Portal",
        icon: UserIcon,
        action: () => router.push("/events"),
    },
    {
        label: "Sign Out",
        icon: ArrowRightOnRectangleIcon,
        action: () => logOut(),
    },
];

function ProfileMenu() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user } = useFirebaseAuth();

    const closeMenu = () => setIsMenuOpen(false);

    return (
        <Menu
            open={isMenuOpen}
            handler={setIsMenuOpen}
            placement="bottom-end"
        >
            <MenuHandler>
                <Button
                    variant="text"
                    color="blue-gray"
                    className="flex items-center gap-1 rounded-full py-0.5 pr-2 pl-0.5 lg:ml-auto"
                >
                    <Image
                        src={user?.photoURL ?? DefaultAvatar}
                        width={32}
                        height={32}
                        alt="profile picture"
                        className="border border-gray-900 p-0.5 rounded-full object-cover object-center"
                        unoptimized
                        referrerPolicy="no-referrer"
                    />

                    <ChevronDownIcon
                        strokeWidth={2.5}
                        className={`h-3 w-3 transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
                    />
                </Button>
            </MenuHandler>
            <MenuList className="p-1">
                {profileMenuItems.map(({ label, icon, action }, key) => {
                    const isLastItem = key === profileMenuItems.length - 1;
                    return (
                        <MenuItem
                            key={label}
                            onClick={() => {
                                action();
                                closeMenu();
                            }}
                            className={`flex items-center gap-2 rounded ${
                                isLastItem ? "hover:bg-red-500/10 focus:bg-red-500/10 active:bg-red-500/10" : ""
                            }`}
                        >
                            {createElement(icon, {
                                className: `h-4 w-4 ${isLastItem ? "text-red-500" : ""}`,
                                strokeWidth: 2,
                            })}
                            <Typography
                                as="span"
                                variant="small"
                                className="font-normal"
                                color={isLastItem ? "red" : "inherit"}
                            >
                                {label}
                            </Typography>
                        </MenuItem>
                    );
                })}
            </MenuList>
        </Menu>
    );
}

// nav list component
const navListItems = [
    // {
    //     label: "Events",
    //     icon: CalendarDaysIcon,
    //     link: "/events"
    // },
    {
        label: "Tickets",
        icon: TicketIcon,
        link: "/admin/tickets",
    },
    {
        label: "Queued Tickets",
        icon: QueueListIcon,
        link: "/admin/queued-tickets",
    },
    {
        label: "Users",
        icon: UsersIcon,
        link: "/admin/users",
    },
    {
        label: "Scan",
        icon: QrCodeIcon,
        link: "/admin/scan",
    },
];

function NavList() {
    return (
        <ul className="my-2 flex flex-col gap-2 lg:mb-0 lg:mt-0 lg:flex-row lg:items-center">
            {navListItems.map(({ label, icon, link }, key) => (
                <Link
                    key={key}
                    href={link}
                >
                    <Typography
                        variant="small"
                        color="blue-gray"
                        className="font-normal"
                    >
                        <MenuItem className="flex items-center gap-2 lg:rounded-full">
                            {createElement(icon, {
                                className: "h-[18px] w-[18px]",
                            })}{" "}
                            {label}
                        </MenuItem>
                    </Typography>
                </Link>
            ))}
        </ul>
    );
}

export function ComplexNavbar() {
    const [isNavOpen, setIsNavOpen] = useState(false);

    const toggleIsNavOpen = () => setIsNavOpen((cur) => !cur);

    useEffect(() => {
        window.addEventListener("resize", () => window.innerWidth >= 1024 && setIsNavOpen(false));
    }, []);

    return (
        <Navbar className="lg:mx-4 lg:mt-4 p-2 rounded-none lg:rounded-full lg:pl-6 w-auto transition-all duration-150 max-w-none">
            <div className="relative mx-auto flex items-center text-blue-gray-900">
                <Link href="/admin">
                    <Typography className="mr-4 ml-2 cursor-pointer font-medium text-xl">
                        FraserTickets (Admin)
                    </Typography>
                </Link>
                <div className="absolute top-2/4 left-2/4 hidden -translate-x-2/4 -translate-y-2/4 lg:block">
                    <NavList />
                </div>
                <IconButton
                    size="sm"
                    color="blue-gray"
                    variant="text"
                    onClick={toggleIsNavOpen}
                    className="ml-auto mr-2 lg:hidden"
                >
                    <Bars2Icon className="h-6 w-6" />
                </IconButton>
                <ProfileMenu />
            </div>
            <Collapse
                open={isNavOpen}
                className="h-full"
            >
                <NavList />
            </Collapse>
        </Navbar>
    );
}

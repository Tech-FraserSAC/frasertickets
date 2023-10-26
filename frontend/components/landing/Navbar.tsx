import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

import { RxHamburgerMenu } from "react-icons/rx"
import { useFirebaseAuth } from "../FirebaseAuthContext";

const generalLinks = [
    {
        name: "Home",
        link: "/",
        id: "home",
        priority: false
    },
];

const signedOutLinks = [
    {
        name: "Sign In",
        link: "/login",
        id: "login",
        priority: true
    },
]

const signedInLinks = [
    {
        name: "Open Portal",
        link: "/events",
        id: "events",
        priority: true
    },
]

export default function Header() {
    const [showDropdown, setShowDropdown] = useState(false);
    const {user, loaded} = useFirebaseAuth();

    const links = [
        ...generalLinks,
        ...((loaded && user !== null) 
            ? signedInLinks
            : signedOutLinks)
    ]

    return (
        <header className="bg-[#131313] py-2 lg:py-4 sticky z-[9999999999]">
            <div className="container px-4 mx-auto lg:flex lg:items-center">
                <div className="flex justify-between items-center">
                    <Link href="/" className="font-bold text-xl text-white">
                        FraserTickets
                    </Link>

                    <button
                        className="border border-solid border-gray-600 px-3 py-1 rounded text-gray-600 opacity-50 hover:opacity-75 lg:hidden"
                        aria-label="Menu"
                        data-test-id="navbar-menu"
                        onClick={
                            () => {
                                setShowDropdown(!showDropdown);
                            }}
                        >
                        <RxHamburgerMenu />
                    </button>
                </div>

                <div className={`${showDropdown ? "flex" : "hidden"} lg:flex flex-col lg:flex-row lg:ml-auto mt-3 lg:mt-0`} data-test-id="navbar">
                    {
                        links.map(({ name, link, priority, id }) =>
                            <Link 
                                key={name}
                                href={link}
                                className={`${priority ? "text-blue-600 hover:bg-blue-600 hover:text-white text-center border border-solid border-blue-600 mt-1 lg:mt-0 lg:ml-1" : "text-gray-400 hover:bg-gray-200 hover:text-gray-600 "} p-2 lg:px-4 lg:mx-2 rounded duration-300 transition-colors `}
                                data-test-id={`navbar-${id}`}
                            >
                                {name}
                            </Link>
                        )
                    }
                </div>
            </div>
        </header>
    )
}
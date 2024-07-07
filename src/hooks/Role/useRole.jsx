import { useEffect, useState } from "react"

const useRole = () => {

    const userRole = localStorage.getItem("role")
    const isSuper = localStorage.getItem("isSuper")

    const [role, setRole] = useState(0)

    useEffect(() => {
        if (userRole == "admin" && isSuper == 1) {
            setRole(1)
        } else if (userRole == "admin" && isSuper == 0) {
            setRole(2)
        } else if (userRole == "clinic") {
            setRole(3)
        } else if (userRole == "doctor") {
            setRole(4)
        }
    }, [isSuper , userRole]);

    return role
}

export default useRole
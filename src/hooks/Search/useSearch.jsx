import { useEffect, useState } from "react"

const useSearch = ({data , search , name}) => {

    const [newData, setNewData] = useState([])

    useEffect(() => {
        if (search?.length > 0 && search?.charCodeAt(0) !== 32) {
            const newData = data && data.filter((admin) => admin[name].toLowerCase().includes(search.toLowerCase()));
            setNewData(newData);
        } else {
            setNewData(data);
        }
    }, [search, data , name]);

    return newData
}

export default useSearch
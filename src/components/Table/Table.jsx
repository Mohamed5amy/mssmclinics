import {
    CircularProgress,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import Person4Icon from "@mui/icons-material/Person4";
import { Link } from "react-router-dom";
// import useHandlePriv from "../../hooks/useHandlePriv";

const Table = ({ headers, data, body, edit, profile, loading }) => {
    if (loading) {
        return (
            <Typography textAlign={"center"} pt={40}>
                <CircularProgress />
            </Typography>
        );
    } else {
        return data?.length > 0 ? (
            <Stack
                px={8}
                bgcolor={"primary.white"}
                width={"100%"}
                borderRadius={"16px"}
                pb={8}
                className="Table"
                sx={{ overflow: "scroll" }}
                maxHeight={"400px"}
            >
                <Stack
                    minWidth={{xs : "900px" , md : "400px"}}
                    position={"relative"}
                    maxWidth={"100%"}
                >
                    {/* Head */}
                    <TableHeader
                        headers={headers}
                        edit={edit}
                        profile={profile}
                    />
                    {/* Body */}
                    <Stack spacing={8}>
                        {data?.length > 0 &&
                            data?.map((item, i) => {
                                return (
                                    <TableItem
                                        key={item.id}
                                        item={item}
                                        i={i}
                                        body={body}
                                        edit={edit}
                                        profile={profile}
                                    />
                                );
                            })}
                    </Stack>
                </Stack>
            </Stack>
        ) : (
            <Typography textAlign={"center"} pt={40} fontWeight={500}>
                
                لا يوجد بيانات حتي الان
            </Typography>
        );
    }
};

const TableHeader = ({ headers, edit, profile }) => {
    return (
        <Stack
            direction={"row"}
            py={8}
            borderBottom={"1px solid"}
            borderColor={"primary.border"}
            mb={8}
            spacing={4}
            position={"sticky"}
            top={0}
            bgcolor={"primary.white"}
            zIndex={3}
        >
            <Typography variant="subtitle" flex={0.5}>
                الرقم
            </Typography>
            {headers?.length > 0 &&
                headers.map((header, i) => {
                    return (
                        <Typography variant="subtitle" flex={2} key={i}>
                            {header}
                        </Typography>
                    );
                })}
            {(edit || profile) && (
                <Typography variant="subtitle" flex={1}>
                    الاجراءات
                </Typography>
            )}
        </Stack>
    );
};

const TableItem = ({ item, i, body, edit, profile }) => {
    return (
        <Stack
            py={6}
            direction={"row"}
            borderBottom={"1px solid"}
            borderColor={"primary.border"}
            spacing={4}
            whiteSpace={"nowrap"}
            alignItems={"center"}
            maxWidth={"100%"}
        >
            <Typography variant="body" color={"text.secondary"} flex={0.5}>
                
                {i + 1}
            </Typography>

            {body?.map((item2, i) => {
                return (
                    <Typography
                        key={i}
                        variant="body"
                        color={"text.secondary"}
                        flex={2}
                        pr={4}
                        noWrap
                    >
                        <Tooltip title={item[item2] && item[item2]}>
                            
                            {item[item2] &&
                                item[item2]?.toString().slice(0, 20)}
                        </Tooltip>
                    </Typography>
                );
            })}

            {(edit || profile) && (
                <Typography variant="body" color={"text.secondary"} flex={1}>
                    <Stack direction={"row"} spacing={1}>
                        {edit && (
                            <Link
                                onClick={() =>
                                    localStorage.setItem(
                                        "admin_edit_data",
                                        JSON.stringify(item)
                                    )
                                }
                                to={"edit/" + item?.id}
                            >
                                <IconButton sx={{ color: "#32C652" }}>
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M5.53999 19.5201C4.92999 19.5201 4.35999 19.31 3.94999 18.92C3.42999 18.43 3.17999 17.69 3.26999 16.89L3.63999 13.65C3.70999 13.04 4.07999 12.23 4.50999 11.79L12.72 3.10005C14.77 0.930049 16.91 0.870049 19.08 2.92005C21.25 4.97005 21.31 7.11005 19.26 9.28005L11.05 17.97C10.63 18.42 9.84999 18.84 9.23999 18.9401L6.01999 19.49C5.84999 19.5 5.69999 19.5201 5.53999 19.5201ZM15.93 2.91005C15.16 2.91005 14.49 3.39005 13.81 4.11005L5.59999 12.8101C5.39999 13.0201 5.16999 13.5201 5.12999 13.8101L4.75999 17.05C4.71999 17.38 4.79999 17.65 4.97999 17.82C5.15999 17.99 5.42999 18.05 5.75999 18L8.97999 17.4501C9.26999 17.4001 9.74999 17.14 9.94999 16.93L18.16 8.24005C19.4 6.92005 19.85 5.70005 18.04 4.00005C17.24 3.23005 16.55 2.91005 15.93 2.91005Z"
                                            fill="currentColor"
                                        />
                                        <path
                                            d="M17.3404 10.9501C17.3204 10.9501 17.2904 10.9501 17.2704 10.9501C14.1504 10.6401 11.6404 8.27009 11.1604 5.17009C11.1004 4.76009 11.3804 4.38009 11.7904 4.31009C12.2004 4.25009 12.5804 4.53009 12.6504 4.94009C13.0304 7.36009 14.9904 9.22009 17.4304 9.46009C17.8404 9.50009 18.1404 9.87009 18.1004 10.2801C18.0504 10.6601 17.7204 10.9501 17.3404 10.9501Z"
                                            fill="currentColor"
                                        />
                                        <path
                                            d="M21 22.75H3C2.59 22.75 2.25 22.41 2.25 22C2.25 21.59 2.59 21.25 3 21.25H21C21.41 21.25 21.75 21.59 21.75 22C21.75 22.41 21.41 22.75 21 22.75Z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                </IconButton>
                            </Link>
                        )}

                        {profile && (
                            <Link
                                onClick={() =>
                                    localStorage.setItem(
                                        "admin_edit_data",
                                        JSON.stringify(item)
                                    )
                                }
                                to={item?.id?.toString()}
                            >
                                <IconButton>
                                    <Person4Icon color="primary" />
                                </IconButton>
                            </Link>
                        )}
                    </Stack>
                </Typography>
            )}
        </Stack>
    );
};

export default Table;

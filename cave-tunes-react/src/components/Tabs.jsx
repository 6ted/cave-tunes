// ======================================================
// CAVE TUNES
// ADMIN REQUEST TABS
// src/components/Tabs.jsx
// ======================================================

function Tabs({
    current,
    setCurrent,
    withdraw = false,
}) {

   const tabs = withdraw
    ? [
        {
            key: "pending",
            label: "Pending",
        },
        {
            key: "approved",
            label: "Approved",
        },
        {
            key: "rejected",
            label: "Rejected",
        },
    ]
    : [
        {
            key: "pending",
            label: "Pending",
        },
        {
            key: "approved",
            label: "Approved",
        },
        {
            key: "rejected",
            label: "Rejected",
        },
    ];


    return (
        <div
            className="admin-tabs"
            role="tablist"
        >

            {tabs.map(tab => (

                <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={
                        current === tab.key
                    }
                    className={
                        current === tab.key
                            ? "admin-tab active"
                            : "admin-tab"
                    }
                    onClick={() =>
                        setCurrent(tab.key)
                    }
                >

                    {tab.label}

                </button>

            ))}

        </div>
    );
}


export default Tabs;
import { useState } from "react";
import styles from "./EventLog.module.css"

function OnEventLogClick() {
    alert("ААА БЛЯ ТЫ КУДА НАЖИМАЕШЬ НЕ РАБОТАЕТ ЕЩЕ ПОКА ЧТО НИХУЯ")
}

export function EventLog() {
    return (
        <button className={styles.Button} onClick={OnEventLogClick}>Event Log</button>
    )
}
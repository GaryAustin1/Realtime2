//This code is still being developed.  Also it does not yet incorporate RT in realworld error recovery

async function app () {
    let supaclient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const primaryCol = "id"  // would need changes for composite primary
    const table = "realtest"

    // this is a loop to generate 20 updates or inserts for testing while the subscription is setup
    // The result should be a table with 20 rows all having after-x for message
    // First set table to before for multiple runs
    const {data,error} = await supaclient.from(table).update({message:'before'}).select().not('id','is',null)
    console.log('table before',data)
    let i = 1;
    let interval = setInterval(function() {
        if (i <= 20) {
            console.log('update',i)
            supaclient.from(table).update({message: 'after' + i}).eq(primaryCol, i).then()
            i++;
        }
        else {
            clearInterval(interval);
        }
    }, 50);

    console.log('start subscription')

    let eventQueue = []     // holds realtime events before initial table load
    let memoryTable = []    // The table of data we want to keep refreshed
    let initMemoryTable = false    // Don't need to queue anymore when true
    let connected = false     // The postgres_changes event fires continuously so need flag

    const mySubscription = supaclient
        .channel('myChannel')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: table,}, (payload) => {
                console.log('event, ',payload.eventType,payload.new.id)
                if (initMemoryTable)
                    handleEvent(payload)  // running normally
                else
                    eventQueue.unshift(payload)  // insert for later
            })
        .subscribe((status)=>{
            console.log('subscribe_status, '+status);
        })
        .on('system', {}, payload => {                // need this to know when REALLY connected
            if (payload.extension === 'postgres_changes') {
                if (!connected) {
                    console.log('postgres_changes received, load initial data')
                    connected = true
                    // load initial data
                    supaclient.from(table).select('*').order(primaryCol).limit(20).then(result=>{
                        console.log('initial data loaded',result)
                        //merge previous events into data table
                        eventQueue.forEach((row)=> {
                            handleEvent(row)
                        })
                        memoryTable = result.data
                        initMemoryTable = true
                    })
                }
            }
        })
    function handleEvent(payload) {
        console.log('handleEvent', payload.eventType,payload.new.id)
        switch (payload.eventType) {
            case "INSERT":   //Doing an "upsert" to handle inserting to existing ids from the eventqueue
                let objIndex1 = memoryTable.findIndex((obj => obj[primaryCol] === payload.new[primaryCol]));
                if (objIndex1 !== -1)
                    memoryTable[objIndex1] = payload.new
                else
                    memoryTable.unshift(payload.new)
                break
            case "UPDATE":
                let objIndex2 = memoryTable.findIndex((obj => obj[primaryCol] === payload.new[primaryCol]));
                if (objIndex2 !== -1)
                    memoryTable[objIndex2] = payload.new
                break
            case "DELETE":
                let objIndex3 = memoryTable.findIndex((obj => obj[primaryCol] === payload.old[primaryCol]));
                if (objIndex3 !== -1)
                    memoryTable.splice(objIndex3, 1)
                break
        }

    }

// just to show final result
    setTimeout(function(){
        console.log('table after ', memoryTable)
    }, 2000)

}
document.addEventListener("DOMContentLoaded", function(event) {
    app()
})

let startTime = Date.now()
function logToHTML (message) {
    let node = document.createElement("div");
    node.appendChild(document.createTextNode((Date.now()-startTime) +', '+ message));
    document.getElementById("log").appendChild(node);
}

//This code is still being developed.  Also it does not yet incorporate RT in realworld error recovery

async function app () {
    let supaclient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)


   //  NEXT SECTION IS JUST FOR TESTING
    // this is a loop to generate 20 updates or inserts for testing while the subscription is setup
    // The result should be a table with 20 rows all having after-x for message
    // First set table to before for multiple runs
    const {data:data1,error:error1} = await supaclient.from('realtest').delete().not('id','is',null)
    console.log(data1,error1)
    for (let i=1; i <= 20; i++ ) {
        const {data:data2,error:error2} = await supaclient.from('realtest').insert({id:i,message:'before'+i})
    }

    console.log('table initialized')

    let i = 1
    let interval = setInterval(function() {
        if (i <= 20) {
            console.log('update',i)
            supaclient.from('realtest').insert({id:i+20,message:'insert'+(i+20)}).then()  // add 20 new rows
            supaclient.from('realtest').update({message: 'after' + i}).eq('id', i).then()
            i++
        }
        else {
            clearInterval(interval)
        }
    }, 50)

    // End of test setup

    console.log('start subscription')
    async function startStream(memoryTable,tableName,primaryCol,eventHandler) {
        console.log('startStream',table)
        let eventQueue = []     // holds realtime events before initial table load
        let initMemoryTable = false    // Don't need to queue anymore when true
        let connected = false     // The postgres_changes event fires continuously so need flag
        let visible = true
        let restart = false
        let mySubscription = supaclient
            .channel('myChannel')
            .on('postgres_changes',
                {event: '*', schema: 'public', table: tableName,}, (payload) => {
                    console.log('event, ', payload.eventType, payload.new.id)
                    if (initMemoryTable)
                        handleEvent(payload,memoryTable,primaryCol)  // running normally
                    else
                        eventQueue.unshift(payload)  // insert for later
                })
            .subscribe((status) => {
                console.log('subscribe_status, ' + status);
                if (status !== 'SUBSCRIBED') {
                    connectionErrorHandler(status)
                }
            })
            .on('system', {}, payload => {                // need this to know when REALLY connected
                if (payload.extension === 'postgres_changes') {
                    if (!connected) {
                        console.log('postgres_changes received, load initial data')
                        connected = true
                        // load initial data
                        supaclient.from(tableName).select('*').order(primaryCol).then(result => {
                            console.log('initial data loaded', result)
                            memoryTable.push(...result.data)
                            //merge previous events into data table
                            eventQueue.forEach((row) => {
                                handleEvent(row,memoryTable,primaryCol)
                            })
                            initMemoryTable = true
                        })
                    }
                }
            })
    }

    //eventHandler is separate as it might be different based on insert/update/delete pattern desired
    function handleEvent(payload,memoryTable,primaryCol) {
        console.log('handleEvent', payload.eventType, payload.new.id,primaryCol)
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

    let testTable = []
    const pCol = 'id'  // would need changes for composite primary
    const table = "realtest"
    startStream(testTable,table,pCol,handleEvent)


    async function start_up() {
        console.log('start status',mySubscription,mySubscription.state,restart,document.visibilityState)
        if (document.visibilityState === 'visible' && restart) {
            mySubscription.subscribe()
        }
    }

    async function connectionErrorHandler (status) {
        restart = true
        if (status !== 'CLOSED') mySubscription.unsubscribe()
        console.log('disconnect',status,mySubscription)
        if (document.visibilityState === 'visible') start_up()
        else {

        }
    }

    document.onvisibilitychange = () => {
        console.log('visibility change',document.visibilityState)
        start_up()
    };

// just to show final result
    setTimeout(function(){
        console.log('table after ', testTable)
        //supaclient.removeChannel(mySubscription)

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

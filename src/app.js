//This code is still being developed.  Recovery after error working, but not at all set up for multiple connections

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
            supaclient.from('realtest').update({message: 'after' + i}).eq('id', i).then()  //update first 20 rows
            i++
        }
        else {
            clearInterval(interval)
        }
    }, 50)

    // END OF TESTING SETUP


    let mySubscription = {}
    async function startStream(memoryTable,tableName,primaryCol,eventHandler,handleTableInit) {
        console.log('startStream',tableName)
        let eventQueue = []     // holds realtime events before initial table load
        let initMemoryTable = false    // Don't need to queue anymore when true
        let connected = false     // The postgres_changes event fires continuously so need flag
        mySubscription = supaclient
            .channel('myChannel')
            .on('postgres_changes',
                {event: '*', schema: 'public', table: tableName,}, (payload) => {
                    console.log('event, ', payload.eventType, payload.new.id)  // console only works with a column of id
                    if (initMemoryTable)
                        eventHandler(payload,memoryTable,primaryCol)  // running normally
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
                        handleTableInit(memoryTable,tableName,primaryCol).then(result=>{
                            //merge previous events into data table
                            eventQueue.forEach((row) => {
                                eventHandler(row, memoryTable, primaryCol)
                            })
                            initMemoryTable = true
                        })
                    }
                }
            })
    }

    //handleEvent and handleTableEvent is separate as it might be different based on insert/update/delete pattern desired
    function handleEvent(payload,memoryTable,primaryCol) {
        console.log('handleEvent', payload.eventType, payload.new.id,primaryCol) //console only works with an id col.
        switch (payload.eventType) {
            case "INSERT":   //Doing an "upsert" to handle inserting to existing ids from the eventqueue
                let objIndex1 = memoryTable.findIndex((obj => obj[primaryCol] === payload.new[primaryCol]));
                if (objIndex1 !== -1)
                    memoryTable[objIndex1] = payload.new
                else
                    memoryTable.unshift(payload.new)  //insert here just adds to end -- no resort of order in this test
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
    async function handleTableInit(memoryTable,tableName,primaryCol) {
        const result = await supaclient.from(tableName).select('*').order(primaryCol)
        console.log('initial data loaded', result)
        memoryTable.push(...result.data)
    }
    console.log('start subscription')
    let restart = false
    let testTable = []
    const pCol = 'id'  // would need changes for composite primary
    const table = "realtest"
    startStream(testTable,table,pCol,handleEvent,handleTableInit)

    //test need a counter for additional ids....
    let afterid=41
    async function start_up() {

        console.log('start_up')
        if (document.visibilityState === 'visible' && restart) {
            console.log('start stream')
            startStream(testTable,table,pCol,handleEvent,handleTableInit)
            restart = false
                //test inserts
            console.log('test insert after')
            supaclient.from('realtest').insert({id:afterid,message:'insert'+(afterid)}).then()  // test to add row after reconnect
            afterid++  //test
        }
    }

    async function connectionErrorHandler (status) {
        restart = true
        if (status !== 'CLOSED') mySubscription.unsubscribe()
        console.log('disconnect',status)
        if (document.visibilityState === 'visible') {
            start_up()              // got an error, but tab still running so restart
        }
    }

    document.onvisibilitychange = () => {
        console.log('visibility change',document.visibilityState)
        if (document.visibilityState === 'visible')
            start_up()
        else {}        //right now doing nothing on hidden.  Another option is to set a time to close the subscription after x minutes
    };

// just to show final result
    setTimeout(function(){
        console.log('table after ', testTable)
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

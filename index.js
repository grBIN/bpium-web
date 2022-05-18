const fastify = require('fastify')()
const axios = require('axios')
let token = 'bWloYWlsb3YuYW5kcmV5LmdyYmluQGdtYWlsLmNvbTphZGY0NTZISUxPTGJw'
fastify.post('/', onHook)

// Run the server!
const start = async () => {
    try {
        await fastify.listen(80)
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()

async function onHook(res) {
    let payload = res.body.payload;
    let event = res.body.hook.event
    let resFromServer = await axios.get('https://test.bpium.ru/api/webrequest/request').then(response => response.data.value)
    let { catalogId, recordId, values, prevValues } = payload;
    let comment = commentGen(event, recordId, resFromServer, values, prevValues)
    let headers = {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json'
    }

    // #1
    // При изменении статуса Заказа необходимо чтобы в поле комментарий записывалась информация хранящаяся в объекте "value", 
    // получаемая веб-запросом с внешний страницы: https://test.bpium.ru/api/webrequest/request

    axios.patch(`https://pleskovdev.bpium.ru/api/v1/catalogs/${catalogId}/records/${recordId}`,{
            values: { '2': comment }
        }, { headers })
        .catch(err => console.log(err))


    // #2   
    // -Написать сценарий который при создании Заказа будет создавать запись в каталоге Склад,
    // где в поле Комментарий будет содержаться текст из Комментария в записи каталога Заказы,
    // а в поле Заказ каталога Склад указана запись созданного заказа.
    if (event === 'record.created') {
        axios.post(`https://pleskovdev.bpium.ru/api/v1/catalogs/12/records`, {
            values: {
                '3': [{
                    catalogId,
                    recordId
                }],
                '4': comment,
            }
        }, { headers })
        .catch(err => console.log(err))
    }
}
















function commentGen(event, recordId, resFromServer, values, prevValues) {
    let statusList = ['Новый', 'Выполнен']
    let newStatus = statusList[Number(values[1]) - 1]
    let prevStatus = statusList[Number(prevValues[1]) - 1]
    let currentDate = new Date().toLocaleString()

    let comment = ''
    if (event === 'record.updated') {
        comment =
            `Обновление записи №${recordId}: ${currentDate}
Статус изменен c ${prevStatus}, на ${newStatus}!
Строка из API: ${resFromServer}`
    } else if (event === 'record.created') {
        comment =
            `Создана запись №${recordId}: ${currentDate}
Статус ${newStatus}!
Строка из API: ${resFromServer}`
    }
    console.log(comment);
    return comment

}
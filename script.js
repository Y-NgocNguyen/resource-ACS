
const table = document.getElementById('content');
let data = [];
const statusMap = {
    'Answer': 'Answer', // 1
    'Miss call': 'MissCall', // 3
    'Caller Hangup': 'CallHp',  // 2
    'other': "other"//0
};
const statusMap2 = {
    0: 'Miss call',
    1: 'Answer',
    2: 'Miss call',
    3: 'Miss call',
};

(async () => {

    try {
        var getDate = await fetch("https://nodered.vncluster.infodation.com/api/getCallLog");
        var result = await getDate.json();


        const customerMap = await fetchAndProcessCustomers("https://nodered.vncluster.infodation.com/api/getCustomer");
        const resellerMap = await fetchAndProcessCustomers("https://nodered.vncluster.infodation.com/api/getReseller");
        let dataProcess = result.map(i => {
            const sentiment = JSON.parse(i.sentiment);
            return {
                callerId: i.callerId ?? '',
                callerNumber: i.callerNumber,
                callerName: customerMap.get(i.callerNumber) ?? '',
                calleeName: i.calleeName == '8:acs:3b020308-3c32-47cd-8ae6-4533874b94f6_00000020-0fbf-5408-02c3-593a0d000a7a' ? 'Admin Kikker' : resellerMap.get(i.calleeName?.substring(2) ?? '') ?? '',
                startTime: formatDate(i.startTime),
                endTime: formatDate(i.endTime),
                duration: i.duration ?? '',
                audioRecord: i.audioRecord,
                transcription: i.transcription,
                sentiment: {
                    positive: parseFloat(sentiment?.Positive?.toFixed(2) ?? 0),
                    neutral: parseFloat(sentiment?.Neutral?.toFixed(2) ?? 0),
                    negative: parseFloat(sentiment?.Negative?.toFixed(2) ?? 0)
                },
                status: statusMap2[i.status],
            };
        });
        data = dataProcess;
        updateTable(dataProcess);
    } catch (error) {
        console.error('Error:', error);
    }
})();

async function fetchAndProcessCustomers(url) {
    const customerNames = await fetch(url);
    const customerResult = await customerNames.json();
    const cusFilter = customerResult.filter((customer) => customer.name !== '' && customer.phone !== '' && customer.phone !== "11111111111");
    const customerMap = cusFilter.reduce((map, customer) => {
        map.set(customer.phone, customer.name);
        return map;
    }, new Map());

    return customerMap;
}
const formatDate = (startTime) => {
    const date = new Date(startTime);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} UTC`;
    if (year === 1970) {
        return '';
    }
    return formattedDate;
}



const statusFilter = document.getElementById('status-filter');
const search = document.getElementById('search');
statusFilter.addEventListener('change', () => {
    const status = statusFilter.value.toLowerCase();
    const filteredData = data.filter(row => status === 'all' || row.status.toLowerCase() === status);
    updateTable(filteredData);
});

search.addEventListener('input', () => {
    const keyword = search.value.toLowerCase();
    let filteredData;

    if (keyword === "#") {
        filteredData = data.filter(row => row.callerName === '');
    } else {
        filteredData = data.filter(row => {
            return row.callerNumber.toLowerCase().includes(keyword) ||
                row.callerName.toLowerCase().includes(keyword) ||
                row.calleeName.toLowerCase().includes(keyword) ||
                row.callerId.toLowerCase().includes(keyword);
        });
    }
    updateTable(filteredData);
});

document.getElementById('overlay').addEventListener('click', function () {
    document.getElementById('popup').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
});

function AddTxt() {
    const txtLink = document.querySelectorAll('.txtLink');
    txtLink.forEach((link) => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const data = this.getAttribute('data-content');
            document.getElementById('popupContent').innerText = data == 'null' ? '' : data;
            document.getElementById('popup').style.display = 'block';
            document.getElementById('overlay').style.display = 'block';

        });
    });
}

function BorderRadius() {
    const sentiments = document.getElementsByClassName('sentiment-bar');
    Array.from(sentiments).forEach((sentiment) => {
        var children = sentiment.children;
        const filteredChildren = Array.from(children).filter((child) => {
            const style = window.getComputedStyle(child);
            const iValue = style.getPropertyValue('--i').trim();
            return iValue !== '0';
        });

        if (filteredChildren.length > 0) {
            filteredChildren[0].style.borderTopLeftRadius = '4px';
            filteredChildren[0].style.borderBottomLeftRadius = '4px';

            const lastIndex = filteredChildren.length - 1;
            filteredChildren[lastIndex].style.borderTopRightRadius = '4px';
            filteredChildren[lastIndex].style.borderBottomRightRadius = '4px';
        }
    });
}
function AudioRecord() {
    const audioElements = document.getElementsByClassName('myAudio');
    Array.from(audioElements).forEach((audioElement) => {
        audioElement.addEventListener('play', function () {
            this.style.width = '350%';
            this.style.transform = 'translateX(-40%)';
        });

        const resizeToOriginal = () => {
            audioElement.style.width = '100%';
            audioElement.style.transform = 'none';
        };

        audioElement.addEventListener('pause', resizeToOriginal);
        audioElement.addEventListener('ended', resizeToOriginal);
    });
}

function updateTable(filteredData) {
    const createSpan = (sentimentValue) => {
        if (sentimentValue == 0) {
            return '';
        } else {
            return `<span>${(sentimentValue * 100).toFixed(2)}%</span>`;
        }
    }
    table.innerHTML = ''; // Xóa dữ liệu hiện tại trên bảng
    filteredData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${row.callerNumber}</td>
          <td>${row.callerName}</td>
          <td>${row.calleeName}</td>
          <td>${row.startTime}</td>
          <td>${row.endTime}</td>
          <td>${row.duration}</td>
          <td>
          <audio controls class="myAudio">
            <source src="${row.audioRecord}" type="audio/wav">
          </audio>
          </td>

          <td>
            <a href="#" class="txtLink" data-content="${row.transcription}">Open File</a>
          </td>
          <td>
              <div class="sentiment-bar">
                <div style="--i:${row.sentiment.positive}" class="positive">
                  ${createSpan(row.sentiment.positive)}
                </div>
                <div  style="--i:${row.sentiment.neutral}"class="neutral">
                  ${createSpan(row.sentiment.neutral)}
                </div>
                <div style="--i:${row.sentiment.negative}" class="negative">
                  ${createSpan(row.sentiment.negative)}
                  </div>
              </div>
          </td>
          <td class="${statusMap[row.status]}">${row.status}</td>
          <td class="truncate" title="${row.callerId}">${row.callerId}</td>
      `;
        table.appendChild(tr);
    });
    BorderRadius();
    AddTxt();
    AudioRecord();
}

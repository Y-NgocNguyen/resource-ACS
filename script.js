
(async function () {
    const utils = {
        formatDate(startTime) {
            const date = new Date(startTime);
            if (date.getUTCFullYear() === 1970) return '';
            return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date.getUTCDate().toString().padStart(2, '0')} ${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')} UTC`;
        },
        createSpan(sentimentValue) {
            return sentimentValue === 0 ? '' : `<span>${(sentimentValue * 100).toFixed(2)}%</span>`;
        }
    };

    async function fetchAndProcessCustomers(url) {
        const response = await fetch(url);
        const customers = await response.json();
        return customers.reduce((map, customer) => {
            if (customer.name && customer.phone && customer.phone !== "11111111111") {
                map.set(customer.phone, customer.name);
            }
            return map;
        }, new Map());
    }

    async function updateUI() {
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
        function applyStatusClass(status) {
            const statusClass = statusMap[status] || 'MissCall';
            return statusClass;
        }
        function applyStatusClass2(status) {
            const statusClass = statusMap2[status] || 'MissCall';
            return statusClass;
        }

        function setTbodyHeight() {
            let tbody = document.querySelector("tbody");
            let trs = tbody.getElementsByTagName("tr");
            let totalHeight = 0;
            let maxRows = 8;
            for (let i = 0; i < trs.length && i < maxRows; i++) {
                totalHeight += trs[i].clientHeight;
            }
            tbody.style.height = totalHeight + "px";
        }

        function addTxtListeners() {
            document.querySelectorAll('.txtLink').forEach(link => {
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    const data = this.getAttribute('data-content');
                    document.getElementById('popupContent').innerText = data === 'null' ? '' : data;
                    document.getElementById('popup').style.display = 'block';
                    document.getElementById('overlay').style.display = 'block';
                });
            });
        }

        function borderRadiusAdjustment() {
            document.querySelectorAll('.sentiment-bar').forEach(sentiment => {
                const children = Array.from(sentiment.children).filter(child => window.getComputedStyle(child).getPropertyValue('--i').trim() !== '0');
                if (children.length > 0) {
                    children[0].style.borderTopLeftRadius = '4px';
                    children[0].style.borderBottomLeftRadius = '4px';
                    children[children.length - 1].style.borderTopRightRadius = '4px';
                    children[children.length - 1].style.borderBottomRightRadius = '4px';
                }
            });
        }

        function audioRecordAdjustment() {
            document.querySelectorAll('.myAudio').forEach(audioElement => {
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
            const table = document.getElementById('content');
            table.innerHTML = '';
            filteredData.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.callerNumber}</td>
                    <td>${row.callerName}</td>
                    <td>${row.calleeName}</td>
                    <td>${utils.formatDate(row.startTime)}</td>
                    <td>${utils.formatDate(row.endTime)}</td>
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
                            <div style="--i:${row.sentiment.positive}" class="positive">${utils.createSpan(row.sentiment.positive)}</div>
                            <div style="--i:${row.sentiment.neutral}" class="neutral">${utils.createSpan(row.sentiment.neutral)}</div>
                            <div style="--i:${row.sentiment.negative}" class="negative">${utils.createSpan(row.sentiment.negative)}</div>
                        </div>
                    </td>
                    <td class="${applyStatusClass(row.status)}">${row.status}</td>
                    <td class="truncate" title="${row.callerId}">${row.callerId}</td>
                `;
                table.appendChild(tr);
            });
            borderRadiusAdjustment();
            addTxtListeners();
            audioRecordAdjustment();
            setTbodyHeight();
        }

        // Event listeners for filtering and searching
        document.getElementById('status-filter').addEventListener('change', filterAndSearchTable);
        document.getElementById('search').addEventListener('input', filterAndSearchTable);
        document.getElementById('overlay').addEventListener('click', () => {
            document.getElementById('popup').style.display = 'none';
            document.getElementById('overlay').style.display = 'none';
        });
        let processedData = [];

        let maxRows = 8;
        async function fetchDataAndUpdateTable() {
            document.getElementById('overlay').style.display = 'block';
            try {
                const [callLogData, customerMap, resellerMap] = await Promise.all([
                    fetch("https://nodered.vncluster.infodation.com/api/getCallLog").then(res => res.json()),
                    fetchAndProcessCustomers("https://nodered.vncluster.infodation.com/api/getCustomer"),
                    fetchAndProcessCustomers("https://nodered.vncluster.infodation.com/api/getReseller")
                ]);
                processedData = callLogData.map(i => {
                    const sentiment = JSON.parse(i.sentiment);
                    return {
                        callerId: i.callerId ?? '',
                        callerNumber: i.callerNumber,
                        callerName: customerMap.get(i.callerNumber) ?? '',
                        calleeName: i.calleeName == '8:acs:3b020308-3c32-47cd-8ae6-4533874b94f6_00000020-0fbf-5408-02c3-593a0d000a7a' ? 'Admin Kikker' : resellerMap.get(i.calleeName?.substring(2) ?? '') ?? '',
                        startTime: utils.formatDate(i.startTime),
                        endTime: utils.formatDate(i.endTime),
                        duration: i.duration ?? '',
                        audioRecord: i.audioRecord,
                        transcription: i.transcription,
                        sentiment: {
                            positive: parseFloat(sentiment?.Positive?.toFixed(2) ?? 0),
                            neutral: parseFloat(sentiment?.Neutral?.toFixed(2) ?? 0),
                            negative: parseFloat(sentiment?.Negative?.toFixed(2) ?? 0)
                        },
                        status: applyStatusClass2(i.status),
                    }
                });
                paginationInit(processedData, true);
            } catch (error) {
                console.error('Error:', error);
            }
            finally {
                document.getElementById('overlay').style.display = 'none';
            }
        }
        function paginationInit(data, init) {

            const prevButton = document.getElementById("prev-page");
            const nextButton = document.getElementById("next-page");
            const pageInfo = document.getElementById("pagination-info");
            const gotoPageInput = document.getElementById("goto-page");

            let currentPage = 1;
            let totalPages = Math.ceil(data.length / maxRows);

            // Update the pagination info text
            const updatePageInfo = () => {
                pageInfo.textContent = `${currentPage}/${totalPages}`;
                updateTable(data.slice((currentPage - 1) * maxRows, currentPage * maxRows));
            };

            const loadDataForPage = (page) => {
                currentPage = page;
                updatePageInfo();
            };

            if (init) {
                prevButton.addEventListener("click", () => {
                    if (currentPage > 1) {
                        loadDataForPage(currentPage - 1);
                    }
                });

                nextButton.addEventListener("click", () => {
                    if (currentPage < totalPages) {
                        loadDataForPage(currentPage + 1);
                    }
                });

                // Go to page input change event
                gotoPageInput.addEventListener("change", () => {
                    const requestedPage = parseInt(gotoPageInput.value);
                    if (!isNaN(requestedPage) && requestedPage >= 1 && requestedPage <= totalPages) {
                        loadDataForPage(requestedPage);
                    } else {
                        gotoPageInput.value = currentPage; // Reset to current page if invalid
                    }
                });
            }
            loadDataForPage(currentPage);
        };

        function filterAndSearchTable() {
            const statusFilter = document.getElementById('status-filter');
            const status = statusFilter.value.toLowerCase();
            const search = document.getElementById('search');
            const keyword = search.value.toLowerCase();

            let dataTemp = processedData.filter(row => {
                return row.callerNumber.toLowerCase().includes(keyword) ||
                    row.callerName.toLowerCase().includes(keyword) ||
                    row.calleeName.toLowerCase().includes(keyword) ||
                    row.callerId.toLowerCase().includes(keyword);
            });

            dataTemp = dataTemp.filter(row => status === 'all' || row.status.toLowerCase() === status);
            paginationInit(dataTemp);
        }
        await fetchDataAndUpdateTable();
    }

    await updateUI();
})();

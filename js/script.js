document.addEventListener('DOMContentLoaded', function () {
    initializePage();
    bindEvents();
});

let specialNumbers = {};

function initializePage() {
    specialNumbers = getAllSpecialNumbers();
}

function bindEvents() {
    const evaluateBtn = document.getElementById('evaluateBtn');
    const qqInput = document.getElementById('qqInput');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const closeSidebar = document.getElementById('closeSidebar');

    if (evaluateBtn) {
        evaluateBtn.addEventListener('click', handleEvaluate);
    } else {
        console.error('evaluateBtn not found');
    }

    if (qqInput) {
        qqInput.addEventListener('input', handleInput);
        qqInput.addEventListener('keypress', handleKeyPress);
    } else {
        console.error('qqInput not found');
    }

    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', toggleSidebar);
    } else {
        console.error('sidebarToggleBtn not found');
    }

    if (closeSidebar) {
        closeSidebar.addEventListener('click', closeSidebarHandler);
    }

    document.addEventListener('click', handleOutsideClick);
}

function handleInput(e) {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
}

function handleKeyPress(e) {
    if (e.key === 'Enter') {
        handleEvaluate();
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.add('active');
    }
}

function closeSidebarHandler() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.remove('active');
    }
}

function handleOutsideClick(e) {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const closeSidebar = document.getElementById('closeSidebar');

    if (sidebar && sidebar.classList.contains('active') &&
        !sidebar.contains(e.target) &&
        (!sidebarToggleBtn || !sidebarToggleBtn.contains(e.target)) &&
        (!closeSidebar || !closeSidebar.contains(e.target))) {
        sidebar.classList.remove('active');
    }
}

async function handleEvaluate() {
    const qqInput = document.getElementById('qqInput');

    if (!qqInput) {
        alert('输入框未找到，请刷新页面重试');
        return;
    }

    const qqNumber = qqInput.value.trim();

    const validation = validateQQNumber(qqNumber);
    if (!validation.valid) {
        alert(validation.message);
        qqInput.focus();
        return;
    }

    showLoading(true);

    try {
        const qqData = await fetchQQData(qqNumber);
        if (qqData) {
            updateUI(qqNumber, qqData);
            calculateAndDisplayPrice(qqNumber, qqData);
            showResults(true);
        } else {
            const basicData = {
                nickname: '查询失败',
                level: 0,
                activeDays: 0,
                nextLevelDays: 0,
                vipLevel: 0,
                svip: 0,
                yearVip: 0,
                qid: '未知',
                sign: '查询失败，仅显示基础评估'
            };
            updateUI(qqNumber, basicData);
            calculateAndDisplayPrice(qqNumber, basicData);
            showResults(true);

            setTimeout(() => {
                alert('API查询失败，当前显示的是基于号码本身的基础评估价格。\n实际价值可能因等级、会员等级等因素有所不同。');
            }, 500);
        }
    } catch (error) {
        console.error('QQ评估错误:', error);
        alert('网络连接错误: ' + error.message + '\n请检查网络连接或稍后重试');
        resetUI();
    } finally {
        showLoading(false);
    }
}

function validateQQNumber(qq) {
    if (!qq) {
        return { valid: false, message: '请输入QQ号码' };
    }

    if (!/^\d+$/.test(qq)) {
        return { valid: false, message: 'QQ号码只能包含数字' };
    }

    if (isSpecialNumber(qq)) {
        if (qq.length < 3) {
            return { valid: false, message: '寓意号至少需要3位数字' };
        }
        if (qq.length > 10) {
            return { valid: false, message: 'QQ号码最多10位数字' };
        }
        return { valid: true, message: '' };
    }

    if (qq.length < 5) {
        return { valid: false, message: 'QQ号码至少需要5位数字' };
    }

    if (qq.length > 10) {
        return { valid: false, message: 'QQ号码最多10位数字' };
    }

    if (qq.startsWith('0')) {
        return { valid: false, message: 'QQ号码不能以0开头' };
    }

    return { valid: true, message: '' };
}

async function fetchQQData(qq) {
    const apiUrl = `http://59.153.166.227:20288/api/query?qq=${qq}`;

    const methods = [
        () => fetchWithXHR(apiUrl),
        () => fetchWithFetch(apiUrl),
        () => fetchWithProxy(apiUrl)
    ];

    for (let i = 0; i < methods.length; i++) {
        try {
            const data = await methods[i]();

            if (data && (data.code === 200 || data.状态 === '成功')) {
                const actualData = data.数据 || data.data || data;
                const levelInfo = actualData.等级信息 || {};
                const privilegeInfo = actualData.特权信息 || {};
                const basicInfo = actualData.基础信息 || {};

                if (actualData) {
                    return {
                        nickname: levelInfo.QQ昵称 || basicInfo.QQ昵称 || '未知',
                        level: parseInt(levelInfo.QQ等级) || 0,
                        activeDays: parseInt(levelInfo.累计活跃天数) || 0,
                        nextLevelDays: parseInt(levelInfo.升级剩余天数) || 0,
                        vipLevel: parseInt(levelInfo.QQ会员等级) || 0,
                        svip: parseInt(levelInfo.是否为超级会员) || 0,
                        yearVip: parseInt(levelInfo.是否为年费会员) || 0,
                        qid: basicInfo.QID || '未设置',
                        sign: basicInfo.个性签名 || '暂无签名',
                        registerTime: basicInfo.注册时间 || '未知',
                        rank: levelInfo.综合排名 || '未知',
                        masterLevel: basicInfo.达人等级 || '未知',
                        pcOnline: levelInfo.PC端是否在线 === '1' ? '在线' : '离线',
                        mobileOnline: levelInfo.手机QQ是否在线 === '1' ? '在线' : '离线',
                        privileges: privilegeInfo
                    };
                }
            }
        } catch (error) {
            console.warn(`Method ${i + 1} failed:`, error.message);
            continue;
        }
    }

    return null;
}

function fetchWithXHR(url) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Request timeout'));
        }, 12000);

        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.timeout = 12000;

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                clearTimeout(timeout);
                if (xhr.status === 200) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        resolve(data);
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                } else {
                    reject(new Error(`HTTP ${xhr.status}`));
                }
            }
        };

        xhr.onerror = function () {
            clearTimeout(timeout);
            reject(new Error('Network error'));
        };

        xhr.ontimeout = function () {
            clearTimeout(timeout);
            reject(new Error('Request timeout'));
        };

        try {
            xhr.send();
        } catch (e) {
            clearTimeout(timeout);
            reject(e);
        }
    });
}

async function fetchWithFetch(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

async function fetchWithProxy(url) {
    const proxyUrls = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        `https://cors-anywhere.herokuapp.com/${url}`,
        `https://thingproxy.freeboard.io/fetch/${url}`
    ];

    for (let proxyUrl of proxyUrls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            const response = await fetch(proxyUrl, {
                signal: controller.signal,
                method: 'GET'
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const result = await response.json();

                if (result.contents) {
                    return JSON.parse(result.contents);
                } else {
                    return result;
                }
            }
        } catch (error) {
            continue;
        }
    }

    throw new Error('所有代理都失败了');
}

function updateUI(qqNumber, data) {
    document.getElementById('qqDisplay').textContent = qqNumber;
    document.getElementById('nickname').textContent = data.nickname;
    document.getElementById('nextLevel').textContent = data.nextLevelDays > 0 ? `≈${data.nextLevelDays}天` : '已满级';
    document.getElementById('qid').textContent = data.qid;
    document.getElementById('signature').textContent = data.sign;
    document.getElementById('activeDays').textContent = `${data.activeDays}天`;
    document.getElementById('levelInfo').textContent = `${data.level} 级`;

    const levelInfoElement = document.getElementById('levelInfo');
    if (data.level >= 100) {
        levelInfoElement.style.color = '#ff4d4f';
        levelInfoElement.style.fontWeight = 'bold';
    } else if (data.level >= 50) {
        levelInfoElement.style.color = '#faad14';
    } else {
        levelInfoElement.style.color = '';
        levelInfoElement.style.fontWeight = '';
    }
    document.getElementById('registerTime').textContent = data.registerTime || '未知';
    document.getElementById('rank').textContent = data.rank || '未知';

    document.getElementById('masterLevel').textContent = data.masterLevel || '未知';

    const pcOnlineElement = document.getElementById('pcOnline');
    pcOnlineElement.textContent = data.pcOnline || '未知';
    pcOnlineElement.className = 'info-value online-status ' + (data.pcOnline === '在线' ? 'online' : 'offline');

    const mobileOnlineElement = document.getElementById('mobileOnline');
    mobileOnlineElement.textContent = data.mobileOnline || '未知';
    mobileOnlineElement.className = 'info-value online-status ' + (data.mobileOnline === '在线' ? 'online' : 'offline');

    updateQQAvatar(qqNumber);
    updateMembershipInfo(data);
    updateLevelIcons(data.level);
    updatePrivileges(data.privileges);
}

function updateQQAvatar(qqNumber) {
    const avatarElement = document.getElementById('qqAvatar');
    if (avatarElement) {
        avatarElement.src = `https://q2.qlogo.cn/headimg_dl?spec=100&dst_uin=${qqNumber}`;
        avatarElement.onerror = function () {
            this.src = 'static/picture/qq.jpg';
        };
    }
}

function updateMembershipInfo(data) {
    const memberInfo = document.getElementById('memberInfo');

    const svip = parseInt(data.svip) || 0;
    const yearVip = parseInt(data.yearVip) || 0;
    const vipLevel = parseInt(data.vipLevel) || 0;

    let memberText = '';

    if (svip === 1 && vipLevel > 0) {
        memberText = `超级会员${vipLevel}级`;
    } else if (yearVip === 1 && vipLevel > 0) {
        memberText = `年费会员${vipLevel}级`;
    } else if (vipLevel > 0) {
        memberText = `QQ会员${vipLevel}级`;
    } else {
        memberText = '普通用户';
    }

    memberInfo.textContent = memberText;

    if (vipLevel > 0) {
        memberInfo.classList.add('member-info');
    } else {
        memberInfo.classList.remove('member-info');
    }
}

function updateLevelIcons(level) {
    const levelIconsElement = document.getElementById('levelIcons');
    let icons = '';

    if (level >= 256) {
        const apexCount = Math.floor(level / 256);
        for (let i = 0; i < Math.min(apexCount, 3); i++) {
            icons += '<img src="https://tianquan.gtimg.cn/shoal/qqvip/apexqq.png" alt="时光企鹅" class="level-icon-img" onerror="this.style.display=\'none\'">';
        }
        level = level % 256;
    }

    if (level >= 64) {
        const crownCount = Math.floor(level / 64);
        for (let i = 0; i < crownCount; i++) {
            icons += '<img src="https://tianquan.gtimg.cn/qqVipLevel/item/0/crown.png" alt="皇冠" class="level-icon-img" onerror="this.style.display=\'none\'">';
        }
        level = level % 64;
    }

    if (level >= 16) {
        const sunCount = Math.floor(level / 16);
        for (let i = 0; i < sunCount; i++) {
            icons += '<img src="https://tianquan.gtimg.cn/qqVipLevel/item/0/sun.png" alt="太阳" class="level-icon-img" onerror="this.style.display=\'none\'">';
        }
        level = level % 16;
    }

    if (level >= 4) {
        const moonCount = Math.floor(level / 4);
        for (let i = 0; i < moonCount; i++) {
            icons += '<img src="https://tianquan.gtimg.cn/qqVipLevel/item/0/moon.png" alt="月亮" class="level-icon-img" onerror="this.style.display=\'none\'">';
        }
        level = level % 4;
    }

    if (level >= 1) {
        for (let i = 0; i < level; i++) {
            icons += '<img src="https://tianquan.gtimg.cn/qqVipLevel/item/0/star.png" alt="星星" class="level-icon-img" onerror="this.style.display=\'none\'">';
        }
    }

    levelIconsElement.innerHTML = icons;

    setTimeout(() => {
        levelIconsElement.querySelectorAll('.level-icon-img').forEach(img => {
            if (img.complete && img.naturalWidth === 0) {
                img.style.display = 'none';
            }
        });
    }, 1000);
}

function updatePrivileges(privileges) {
    const privilegesGrid = document.getElementById('privilegesGrid');
    if (!privilegesGrid) return;

    let html = '';

    const privilegesArray = Object.values(privileges || {}).filter(privilege => {
        const level = privilege.目前等级 || privilege.level || '-1';
        return level !== '-1' && level !== '未激活' && level !== '0' && level !== '';
    }).sort((a, b) => {
        const levelA = parseInt(a.目前等级 || a.level) || 0;
        const levelB = parseInt(b.目前等级 || b.level) || 0;

        if (levelB !== levelA) {
            return levelB - levelA;
        }

        const nameA = a.特权名称 || a.name || '';
        const nameB = b.特权名称 || b.name || '';
        return nameA.localeCompare(nameB);
    });

    const displayLimit = 24;
    const displayPrivileges = privilegesArray.slice(0, displayLimit);

    displayPrivileges.forEach(privilege => {
        const level = privilege.目前等级 || privilege.level || '未知';
        const name = privilege.特权名称 || privilege.name || '未知特权';
        const icon = privilege.特权图标 || privilege.icon || 'static/picture/qq.jpg';

        html += `
            <div class="privilege-item" title="${name} (等级: ${level})">
                <img src="${icon}" 
                     alt="${name}" 
                     class="privilege-icon" 
                     onerror="this.src='static/picture/qq.jpg'">
                <div class="privilege-name">${name}</div>
            </div>
        `;
    });

    if (html === '') {
        html = '<div class="empty-message">暂无特权信息</div>';
    } else if (privilegesArray.length > displayLimit) {
        html += `<div class="privilege-item">
                    <div class="privilege-name">+${privilegesArray.length - displayLimit} 更多</div>
                 </div>`;
    }

    privilegesGrid.innerHTML = html;
}

function calculateAndDisplayPrice(qqNumber, data) {
    const analysis = calculatePrice(qqNumber, data);
    updatePriceDisplay(analysis.totalPrice);
    updateAnalysisTable(qqNumber, analysis);
    updateGradeImage(analysis.totalPrice);
}

function checkContainsSpecialSequence(qqNumber) {
    const specialKeys = Object.keys(SPECIAL_NUMBERS_DATA).sort((a, b) => b.length - a.length);

    if (SPECIAL_NUMBERS_DATA[qqNumber]) {
        return {
            sequence: qqNumber,
            info: SPECIAL_NUMBERS_DATA[qqNumber]
        };
    }

    for (let specialKey of specialKeys) {
        if (qqNumber.includes(specialKey)) {
            return {
                sequence: specialKey,
                info: SPECIAL_NUMBERS_DATA[specialKey]
            };
        }
    }

    return null;
}

function calculatePrice(qqNumber, data) {
    const analysis = {
        basePrice: 0,
        specialPrice: 0,
        levelPrice: 0,
        memberPrice: 0,
        digitPrices: [],
        totalPrice: 0,
        headTailMatch: {
            matched: false,
            digit: '',
            value: 0
        }
    };

    if (qqNumber.length > 0 && qqNumber[0] === qqNumber[qqNumber.length - 1]) {
        const firstDigit = qqNumber[0];
        analysis.headTailMatch.matched = true;
        analysis.headTailMatch.digit = firstDigit;

        switch (firstDigit) {
            case '0':
            case '1':
            case '2':
            case '3':
            case '5':
            case '7':
                analysis.headTailMatch.value = 20;
                break;
            case '4':
                analysis.headTailMatch.value = 10;
                break;
            case '6':
            case '9':
                analysis.headTailMatch.value = 30;
                break;
            case '8':
                analysis.headTailMatch.value = 40;
                break;
            default:
                analysis.headTailMatch.value = 0;
        }

        analysis.totalPrice += analysis.headTailMatch.value;
    }

    const length = qqNumber.length;
    const basePrices = {
        5: 16888, 6: 1688, 7: 388, 8: 188, 9: 58, 10: 28
    };
    analysis.basePrice = basePrices[length] || 0;

    let specialInfo = getSpecialNumberInfo(qqNumber);

    if (!specialInfo) {
        const containsSpecial = checkContainsSpecialSequence(qqNumber);
        if (containsSpecial) {
            specialInfo = containsSpecial.info;
            analysis.specialPrice = specialInfo.price;
            analysis.specialType = `包含${specialInfo.type}`;
            analysis.specialSequence = containsSpecial.sequence;
        }
    } else {
        analysis.specialPrice = specialInfo.price;
        analysis.specialType = specialInfo.type;
    }

    if (data.level > 0) {
        analysis.levelPrice = Math.floor(Math.pow(data.level, 1.6));
    }

    if (data.vipLevel > 0) {
        analysis.memberPrice = Math.floor(Math.pow(data.vipLevel, 2.8));
    }

    analysis.digitPrices = calculateDigitPrices(qqNumber);

    analysis.totalPrice = analysis.basePrice + analysis.specialPrice +
        analysis.levelPrice + analysis.memberPrice +
        analysis.digitPrices.reduce((sum, item) => sum + item.price, 0);

    return analysis;
}

function calculateDigitPrices(qqNumber) {
    const digitCount = {};
    const digitPrices = [];

    for (let digit of qqNumber) {
        digitCount[digit] = (digitCount[digit] || 0) + 1;
    }

    const digitPriceMap = {
        '0': 20, '1': 20, '2': 20, '3': 20, '4': 10,
        '5': 20, '6': 30, '7': 20, '8': 40, '9': 30
    };

    for (let digit in digitCount) {
        const count = digitCount[digit];

        if (count > 1) {
            let currentValue = digitPriceMap[digit] || 0;

            const repetitionMultiplier = Math.pow(count, 1.5);
            const lengthFactor = qqNumber.length / 5;

            currentValue = Math.round(currentValue * repetitionMultiplier * lengthFactor);

            if (currentValue > 0) {
                digitPrices.push({
                    digit: digit,
                    count: count,
                    basePrice: digitPriceMap[digit] || 0,
                    price: currentValue
                });
            }
        }
    }

    return digitPrices;
}

function updatePriceDisplay(totalPrice) {
    document.getElementById('totalPrice').textContent = totalPrice;
}

function updateAnalysisTable(qqNumber, analysis) {
    const tbody = document.getElementById('analysisTableBody');
    let html = `
        <tr>
            <td>基础价值</td>
            <td>${qqNumber.length}位QQ号</td>
            <td>${qqNumber}</td>
            <td class="price-positive">+ ${analysis.basePrice}</td>
        </tr>
    `;

    if (analysis.specialPrice > 0) {
        if (analysis.specialSequence) {
            html += `
                <tr>
                    <td>寓意号</td>
                    <td>${analysis.specialType}</td>
                    <td>${analysis.specialSequence}</td>
                    <td class="price-positive">+ ${analysis.specialPrice}</td>
                </tr>
            `;
        } else {
            html += `
                <tr>
                    <td>寓意号</td>
                    <td>${analysis.specialType}</td>
                    <td>${qqNumber}</td>
                    <td class="price-positive">+ ${analysis.specialPrice}</td>
                </tr>
            `;
        }
    } else {
        html += `
            <tr>
                <td>寓意号</td>
                <td>无特殊寓意</td>
                <td>-</td>
                <td class="price-zero">+ 0</td>
            </tr>
        `;
    }

    html += `
        <tr>
            <td>QQ等级</td>
            <td>${document.getElementById('levelInfo').textContent}</td>
            <td>${qqNumber}</td>
            <td class="${analysis.levelPrice > 0 ? 'price-positive' : 'price-zero'}">+ ${analysis.levelPrice}</td>
        </tr>
        <tr>
            <td>会员等级</td>
            <td>${document.getElementById('memberInfo').textContent}</td>
            <td>${qqNumber}</td>
            <td class="${analysis.memberPrice > 0 ? 'price-positive' : 'price-zero'}">+ ${analysis.memberPrice}</td>
        </tr>
    `;

    if (analysis.headTailMatch.matched) {
        html += `
            <tr class="highlight-row">
                <td>首尾循环</td>
                <td>首尾数字[${analysis.headTailMatch.digit}]相同</td>
                <td>数字[${analysis.headTailMatch.digit}]</td>
                <td class="price-positive">+ ${analysis.headTailMatch.value}</td>
            </tr>
        `;
    }

    if (analysis.digitPrices.length > 0) {
        analysis.digitPrices.forEach(item => {
            html += `
                <tr class="highlight-row">
                    <td>重复数字</td>
                    <td>数字[${item.digit}]重复${item.count}次</td>
                    <td>数字[${item.digit}]</td>
                    <td class="price-positive">+ ${item.price}</td>
                </tr>
            `;
        });
    } else {
        html += `
            <tr>
                <td>重复数字</td>
                <td>无重复数字</td>
                <td>-</td>
                <td class="price-zero">+ 0</td>
            </tr>
        `;
    }

    tbody.innerHTML = html;
}

function updateGradeImage(totalPrice) {
    const gradeIcon = document.getElementById('gradeIcon');

    if (totalPrice > 0) {
        let gradeImage = 'D.png';

        if (totalPrice > 5000) {
            gradeImage = 'S.png';
        } else if (totalPrice > 2000) {
            gradeImage = 'A.png';
        } else if (totalPrice > 1000) {
            gradeImage = 'B.png';
        } else if (totalPrice > 500) {
            gradeImage = 'C.png';
        }

        gradeIcon.src = `static/picture/${gradeImage}`;
        gradeIcon.style.display = 'block';
    } else {
        gradeIcon.style.display = 'none';
    }
}

function showLoading(show) {
    const evaluateBtn = document.getElementById('evaluateBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const btnText = evaluateBtn.querySelector('.btn-text');

    if (evaluateBtn) {
        if (show) {
            btnText.textContent = '评估中...';
            loadingSpinner.style.display = 'inline-block';
            evaluateBtn.disabled = true;
        } else {
            btnText.textContent = '评估';
            loadingSpinner.style.display = 'none';
            evaluateBtn.disabled = false;
        }
    }
}

function showResults(show) {
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
        resultsSection.style.display = show ? 'block' : 'none';
    }
}

function resetUI() {
    document.getElementById('nickname').textContent = '-';
    document.getElementById('nextLevel').textContent = '-';
    document.getElementById('memberInfo').textContent = '-';
    document.getElementById('levelInfo').textContent = '-';
    document.getElementById('signature').textContent = '-';
    document.getElementById('qid').textContent = '-';
    document.getElementById('activeDays').textContent = '-';
    document.getElementById('registerTime').textContent = '-';
    document.getElementById('rank').textContent = '-';
    document.getElementById('masterLevel').textContent = '-';
    document.getElementById('pcOnline').textContent = '-';
    document.getElementById('mobileOnline').textContent = '-';
    document.getElementById('levelIcons').innerHTML = '';
    document.getElementById('totalPrice').textContent = '0';
    document.getElementById('gradeIcon').style.display = 'none';
    document.getElementById('qqDisplay').textContent = '-';

    const avatarElement = document.getElementById('qqAvatar');
    if (avatarElement) {
        avatarElement.src = 'static/picture/qq.jpg';
    }

    const tbody = document.getElementById('analysisTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="empty-message">请输入QQ号码进行评估</td></tr>';

    const privilegesGrid = document.getElementById('privilegesGrid');
    if (privilegesGrid) {
        privilegesGrid.innerHTML = '<div class="empty-message">请输入QQ号码进行评估</div>';
    }

    showResults(false);
}
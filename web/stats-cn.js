var allTimeSeries = {};
var allValueLabels = {};
var descriptions = {
    '进程': {
        '挂起': '等待运行时间的进程数',
        '运行': '不间断睡眠的进程数'
    },
    '内存': {
        '使用': '使用的虚拟内存量',
        '空闲': '空闲内存量',
        '缓冲': '用作缓冲的内存量',
        '缓存': '用作缓存的内存量'
    },
    'IO': {
        '接收': '从块设备接收的块（blocks/s）',
        '发送': '发送到块设备的块 (blocks/s)'
    },
    'CPU': {
        'us': 'Time spent running non-kernel code (user time, including nice time)',
        'sy': 'Time spent running kernel code (system time)',
        'id': 'Time spent idle',
        'wa': 'Time spent waiting for IO'
    }
}

function streamStats() {

    var ws = new ReconnectingWebSocket('ws://' + location.host + '/');
    var lineCount;
    var colHeadings;

    ws.onopen = function() {
        console.log('connect');
        lineCount = 0;
    };

    ws.onclose = function() {
        console.log('disconnect');
    };

    ws.onmessage = function(e) {
        switch (lineCount++) {
            case 0: // ignore first line
                break;

            case 1: // column headings
                colHeadings = e.data.trim().split(/ +/);
                break;

            default: // subsequent lines
                var colValues = e.data.trim().split(/ +/);
                var stats = {};
                for (var i = 0; i < colHeadings.length; i++) {
                    stats[colHeadings[i]] = parseInt(colValues[i]);
                }
                receiveStats(stats);
        }
    };
}

function initCharts() {
    Object.each(descriptions, function(sectionName, values) {
        var section = $('.chart.template').clone().removeClass('template').appendTo('#charts');

        section.find('.title').text(sectionName);

        var smoothie = new SmoothieChart({
            grid: {
                sharpLines: true,
                verticalSections: 5,
                strokeStyle: 'rgba(119,119,119,0.45)',
                millisPerLine: 1000
            },
            minValue: 0,
            labels: {
                disabled: true
            }
        });
        smoothie.streamTo(section.find('canvas').get(0), 1000);

        var colors = chroma.brewer['Pastel2'];
        var index = 0;
        Object.each(values, function(name, valueDescription) {
            var color = colors[index++];

            var timeSeries = new TimeSeries();
            smoothie.addTimeSeries(timeSeries, {
                strokeStyle: color,
                fillStyle: chroma(color).darken().alpha(0.5).css(),
                lineWidth: 3
            });
            allTimeSeries[name] = timeSeries;

            var statLine = section.find('.stat.template').clone().removeClass('template').appendTo(section.find('.stats'));
            statLine.attr('title', valueDescription).css('color', color);
            statLine.find('.stat-name').text(name);
            allValueLabels[name] = statLine.find('.stat-value');
        });
    });
}

function receiveStats(stats) {
    Object.each(stats, function(name, value) {
        var timeSeries = allTimeSeries[name];
        if (timeSeries) {
            timeSeries.append(Date.now(), value);
            allValueLabels[name].text(value);
        }
    });
}

$(function() {
    initCharts();
    streamStats();
});

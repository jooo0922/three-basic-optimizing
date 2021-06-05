'use strict';

// SEDAC에서 그리드 형태의 인구 통계 데이터 url을 전달받아서 fetch로 response를 받고, 그거를 텍스트로 반환하는 함수
async function loadFile(url) {
  const req = await fetch(url); // 이 부분을 비동기로 처리해 줌.
  return req.text(); // text()는 fetch의 response를 읽고 텍스트를 반환하는 메소드
}

// loadFile 함수에서 인구 통계 데이터를 텍스트로 반환받으면 해당 텍스트를 파싱해주는 함수
function parseData(text) {
  const data = []; // 좌표 데이터를 push해서 담아놓을 빈 배열
  const settings = {
    data
  }; // settings 객체에 data: [] 이렇게 할당되어 있는 상태겠지
  let max;
  let min; // 각각 가장 큰 좌표데이터와 가장 작은 좌표데이터 값이 담기게 될 변수

  // split('\n')메소드는 전달받은 text string(튜토리얼 웹사이트에서 어떤 형태인지 참고)을 줄 단위로 끊은 문자열들을 배열에 담아 리턴해 줌.
  text.split('\n').forEach((line) => {
    // 줄 단위로 끊어진 문자열 배열에서 각각의 줄들을 인자로 전달하여 forEach를 실행해 줌.
    // line.trim()은 각 줄의 string에서 양 끝의 공백을 먼저 제거한 것.
    const parts = line.trim().split(/\s+/); // /\s+/은 정규표현식을 사용해서 각 줄을 공백을 기준으로 자르도록 구분자를 지정한 것.
    if (parts.length === 2) {
      // 문자열이 공백을 기준으로 2개로 나뉘어졌다면 키/값 쌍 데이터에 해당하겠지
      settings[parts[0]] = parseFloat(parts[1]); // parts[0]은 key, parts[1]은 value에 해당함. settings 오브젝트에 parts[0]이라는 키를 생성하여 거기에 parts[1] 문자열을 부동소수점 실수로 표현하여 할당하라는 뜻. 
    } else if (parts.length > 2) {
      // 공백을 기준으로 문자열이 2개 이상 나눠졌다면 좌표 데이터겠지
      // 각 좌표데이터들을 한줄씩 나눠놓은 것을 공백을 기준으로 쪼개서 담아놓은 배열이 parts잖아. 그러니 각 줄의 좌표데이터를 map()으로 돌면서 처리해주는거지.
      const values = parts.map((v) => {
        const value = parseFloat(v); // 좌표데이터 하나를 부동소수점 실수로 반환하여 value에 할당하고,

        if (value === settings.NODATA_value) {
          // 만약 value에 settings.NODATA_value의 값과 동일한 값이 할당되었다면(즉, -9999지? 좌표데이터 값이 없으면 -9999로 표현하라는 얘기임.)
          // map으로 새로 만들어서 반환해 줄 배열에 undefined를 리턴하고 다음 반복문으로 넘어감.
          return undefined;
        }

        // 만약 value가 -9999가 아닌 다른 값이 존재한다면, 먼저 max, min이 빈값이면 현재의 value를 할당하고(맨 처음 반복문에서 이렇게 하겠지), 
        // 그게 아니면 max, min에 각각 들어있는 자신의 값을 그대로 할당함. 그 상태에서 현재의 value와 max, min을 비교하여 각각 더 큰 값과 작은 값을 max, min에 각각 할당해줌.
        // 이렇게 하면 map을 전부 돌고 나면 -9999가 아닌 value값들 중에서 최대값은 max, 최소값은 min에 할당될거임
        max = Math.max(max === undefined ? value : max, value);
        min = Math.min(min === undefined ? value : min, value);

        return value; // 그리고 마지막으로 해당 value를 map으로 새로 만들어 반환해 줄 배열에 리턴하고 다음 반복문으로 넘어감.
      });

      data.push(values) // undefined 또는 부동소수점 실수값으로 표현된 좌표데이터들을 한줄 단위로 배열에 담아 data 배열에 push해놓음.
      // 왜? values 에는 parts안에 담긴 값으로 새로운 배열을 만들어 할당하는건데, parts는 한줄 단위로 끊긴 좌표데이터들이 들어가 있으니까!
    }
  });

  // Object.assign(대상 객체, 하나 이상의 출처 객체)
  // 이거는 뭐냐면, 말 그대로 대상 객체에 하나 이상의 출처 객체의 속성을 복사하여 넣어주는 기능을 함. 
  // 이렇게 하면 출처 객체의 속성값들이 복사되서 추가된 대상 객체가 리턴되는데, 
  // 결과적으로는 1. 데이터 파일의 키/값 쌍, 2. 좌표데이터 3. 가장 큰 좌표데이터와 가장 작은 좌표데이터값이 담긴 max, min 
  // 요렇게 세 개의 값이 담긴 객체를 리턴받게 된다는 뜻.
  return Object.assign(settings, {
    min,
    max
  });
}

// 데이터를 2d캔버스에 빨간 점으로 렌더링하는 함수
function drawData(file) {
  const {
    min,
    max,
    ncols,
    nrows,
    data
  } = file; // parseData에서 리턴받은 객체의 각각의 key와 value로 변수를 한번에 할당한 것.
  const range = max - min; // 가장 작은 좌표데이터값부터 가장 큰 좌표데이터값 까지의 범위값
  const ctx = document.querySelector('canvas').getContext('2d');

  // 그리드 데이터의 column 갯수가 ncols, row 갯수가 nrows일테니, 그리드 데이터의 크기만큼 캔버스의 pixel size를 지정해 줌.
  ctx.canvas.width = ncols;
  ctx.canvas.height = nrows; // ctx에는 캔버스 객체도 들어있나 봄...

  // 캔버스의 css size는 그리드 데이터 크기의 2배로 지정해서 너무 작아보이지 않게 해준다고 함...
  ctx.canvas.style.width = px(ncols * 2);
  ctx.canvas.style.height = px(nrows * 2);

  // 캔버스의 배경을 짙은 회색의 rect로 채워줌
  ctx.fillStyle = '#444';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // 각 좌표에 fillRect로 빨간색 점을 찍어줌.
  // 이때, row는 data에 존재하는 한줄 단위로 담아놓은 좌표데이터 배열이 전달될거고, 그 한줄 단위의 좌표데이터 배열의 인덱스값이 latIndex(즉, 지도 상에서 '위도'에 해당하기도 하겠지)
  data.forEach((row, latIndex) => {
    // 한줄 단위의 좌표데이터 배열안의 각 좌표데이터를 value로 전달될거고, 각 value의 인덱스값이 lonIndex(즉, 지도 상에서 '경도'에 해당하기도 하겠지)
    row.forEach((value, lonIndex) => {
      if (value === undefined) {
        // 만약 좌표데이터값이 undefined이면 아무것도 하지 않고 바로 다음 반복문으로 넘겨버림.
        return;
      }

      // 좌표데이터값이 undefined가 아니라면, 아래의 내용들을 실행해 줌.
      const amount = (value - min) / range; // 일단 좌표데이터의 전체 범위(max - min) 내에서 현재 좌표데이터의 범위(value - min)이 얼마나 차지하는지 비율을 구함.
      const hue = 1; // hue값을 1로 전달해주면 360도, 즉 red 계열의 컬러가 할당되겠지
      const saturation = 1; // 채도는 100%로 통일.
      const lightness = amount // value(즉, 해당 위도, 경도 좌표 지역의 인구 수를 의미하는 좌표데이터)의 값에 따라 0 ~ 1 사이의 값이 할당된 amount를 명도값으로 할당
      // 왜냐하면, 위에 amount를 계산하는 공식에서 value가 max면 1, min이면 0으로 나오기 때문.
      // 결과적으로 인구가 많을수록 밝은 red, 적을수록 어두운 red 컬러가 할당된 rect가 렌더될거임.

      ctx.fillStyle = hsl(hue, saturation, lightness); // fillStyle로 hsl값도 받을 수 있나 봄.

      // lonIndex는 그리드 데이터 상에서 경도 = 세로줄 = x좌표값으로 할당될 수 있고,
      // latIndex는 그리드 데이터 상에서 위도 = 가로줄 = y좌표값으로 할당될 수 있음.
      // width, height은 동일하게 1px씩 할당.
      ctx.fillRect(lonIndex, latIndex, 1, 1);
    });
  });

  // 결과적으로 이렇게 하면 회색 rect가 그려진 캔버스 위에 어두운 red rect부터 밝은 red rect까지 점이 찍힐텐데
  // value가 -9999인 위도, 경도 좌표값에는 아무것도 찍히지 않기 때문에 회색 rect가 그대로 드러나고,
  // amount값이 낮은 위도, 경도 좌표값은 검정색에 가까운 점이 찍힐꺼고, amount값이 높은 위도, 경도 좌표값은 밝은 red 컬러가 찍힐거임.
}

// 전달받은 값이 존재하면 해당 값을 px로, 존재하지 않으면 0px을 리턴해주는 함수
function px(v) {
  return `${v | 0}px`;
}

// 해당 좌표에 찍어줄 점의 색깔을 fillStyle에 할당할 때 사용할 hsl값을 리턴해주는 함수
function hsl(h, s, l) {
  // 만약에 h, s, l값을 전달받았다면 해당 값에 각각 360, 100, 100을 곱해주고, 전달받지 못한 값은 그냥 0으로 리턴해줌.
  return `hsl(${h * 360 | 0}, ${s * 100 | 0}%, ${l * 100 | 0}%)`
}

// three.js 튜토리얼 웹사이트에서 그리드 인구 통계 데이터 url을 비동기로 가져오는 loadFile을 호출하고, 
// 반환받은 텍스트를 전달해서 parseData를 호출하고, 거기서 또 반환받은 객체를 전달해서 drawData를 전달하는 구조
loadFile('https://threejsfundamentals.org/threejs/resources/data/gpw/gpw_v4_basic_demographic_characteristics_rev10_a000_014mt_2010_cntm_1_deg.asc')
  .then(parseData)
  .then(drawData);
'use strict';

import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';

import {
  BufferGeometryUtils
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/utils/BufferGeometryUtils.js';

import {
  OrbitControls
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/controls/OrbitControls.js';

function main() {
  // create WebGLRenderer
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas
  });

  // create camera
  const fov = 60;
  const aspect = 2;
  const near = 0.1;
  const far = 10;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 2.5;

  // create orbitcontrols
  const controls = new OrbitControls(camera, canvas); // 생성한 카메라와 이벤트를 받는 DOM 요소를 전달해줘야 함.
  controls.enableDamping = true; // 카메라 이동 시 관성(inertia) 효과를 줌.
  controls.enablePan = false; // 카메라 고정 후 수평 회전을 못하게 함. (카메라가 수평회전하면 지구본이 카메라 중심에서 벗어날테니까)
  // min,maxDistance는 dolly in, out의 최소, 최대값을 결정해주는 값임.
  // dolly vs zoom
  // dolly in/out은 카메라를 실제로 물리적으로 움직여서 피사체를 확대시키거나 축소해서 보여주지만
  // zoom in/out은 카메라의 초점 렌즈의 길이를 조절해서 피사체를 확대시키거나 축소해서 보여줌. 둘이 효과는 비슷하지만 원리가 다름.
  controls.minDistance = 1.2;
  controls.maxDistance = 4;
  controls.update(); // 카메라의 이동과 관련하여 변화가 있거나, 아니면 enableDamping값을 설정했다면 반드시 호출해줘야 함.

  // create black colored scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('black');

  // 지구본 텍스처를 로드해서 basic material을 만들고, 구체 지오메트리와 합쳐줘서 구체 메쉬를 만들어서 scene에 추가함.
  {
    const loader = new THREE.TextureLoader();
    /**
     * 여기서 텍스처를 로드한 뒤에 바로 render 함수를 호출하도록 코드를 작성했는데,
     * 왜 이렇게 했냐면 '불필요한 렌더링 삭제' 파트에서 배웠던 것처럼
     * 여기서도 카메라가 움직이거나 하지 않을 경우 불필요하게 render함수를 호출하지 않도록 만들거임.
     * 
     * 그런데 텍스처 로드는 시간이 좀 걸리는 작업인데, render 함수는 카메라가 움직이거나 맨 처음에만 호출하도록 한다면,
     * 만약에 텍스처가 다 로드되기도 전에 render 함수의 첫번째 호출이 이미 되어버렸다면?
     * 텍스처가 씌워지지 않은 지구본이 그대로 화면에 출력될 수밖에 없겠지?
     * 
     * 그래서 텍스처를 로드하고 나서 한번 더 render 함수를 호출해줘야 텍스처가 씌워진 지구본이 제대로 렌더가 되기 때문에
     * render 함수를 호출해주는 것.
     */
    const texture = loader.load('./image/world.jpg', render);
    const geometry = new THREE.SphereGeometry(1, 64, 32);
    const mateiral = new THREE.MeshBasicMaterial({
      map: texture
    });
    scene.add(new THREE.Mesh(geometry, mateiral));
  }

  // optimizing1에서 사용했던 그리드 형태의 인구 통계 데이터 url을 전달받아서 fetch로 response를 받고, 그거를 텍스트로 반환하는 함수
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
    // 결과적으로는 1. 데이터 파일의 키/값 쌍들(원래 대상 객체에 존재하던 속성들), 2. 좌표데이터(원래 대상 객체에 존재하던 속성들) 
    // 3. 가장 큰 좌표데이터와 가장 작은 좌표데이터값이 담긴 max, min 
    // 요렇게 세 개의 값이 담긴 객체를 리턴받게 된다는 뜻.
    return Object.assign(settings, {
      min,
      max
    });
  }

  // optimizing1에서 처럼 canvas에 점으로 표시하는 대신, 좌표 데이터마다 육면체를 생성하여 인구 데이터를 표시해줄 함수
  // 근데 optimizing1의 drawData()함수와 구조 자체는 유사함. 단지 캔버스에 점을 찍느냐, 박스를 그리냐의 차이.
  function addBoxes(file) {
    const {
      min,
      max,
      data
    } = file; // parseData에서 리턴받은 객체의 각각의 key와 value로 변수를 한번에 할당한 것.
    const range = max - min; // 가장 큰 좌표데이터값에서 가장 작은 좌표데이터값을 뺀 범위값

    // 헬퍼 Object3D들을 만들어서 각 박스 메쉬들의 전역 공간상의 좌표값을 쉽게 구할 수 있도록 한거임.
    const lonHelper = new THREE.Object3D();
    scene.add(lonHelper); // 얘를 y축으로 회전시켜서 경도(longitude)를 맞춤

    const latHelper = new THREE.Object3D();
    lonHelper.add(latHelper); // 얘를 x축으로 회전시켜서 위도(latitude)를 맞춤

    const positionHelper = new THREE.Object3D();
    positionHelper.position.z = 1;
    latHelper.add(positionHelper); // 얘는 다른 요소들의 기준축을 구체의 끝에 맞추는 역할을 함.

    // 박스 메쉬들의 중심을 옮겨서 양의 z축 방향으로 커지게함
    const originHelper = new THREE.Object3D();
    originHelper.position.z = 0.5;
    positionHelper.add(originHelper);

    // 지오메트리의 각 vertex에 할당할 색상값을 담아놓을 Color 객체를 만들어놓음.
    const color = new THREE.Color();

    const lonFudge = Math.PI * 0.5; // 90도
    const latFudge = Math.PI * -0.135; // 이 각도들은 각각 lonHelper, latHelper의 회전 각도를 구할 때 사용됨.

    // optimizing_2 예시에서는 메쉬들을 각각 만들어서 총 19000개의 메쉬들이 생성했지만,
    // 이렇게 메쉬들이 많으면 연산요청도 많아져서 프레임이 상당히 버벅거림 내 컴에서 20fps 정도 밖에 안나옴.
    // 그래서 어떻게 할거냐면, 각 육면체 별로 geometry를 19000개 따로 만든 뒤, 얘내들을 merge해서 하나의 geometry로 합칠 수 있음.
    // 이렇게 하나로 합쳐진 geometry와 mateiral을 이용해서 하나의 mesh로 만들면 연산요청이 19000회에서 1회로 줄어드니까
    // 버벅임이 훨씬 덜하겠지! 그래서 일단 19000개의 지오메트리들을 만들어서 담아놓을 배열을 준비해놓은거임.
    const geometries = [];

    data.forEach((row, latIndex) => {
      row.forEach((value, lonIndex) => {
        if (value === undefined) {
          // 만약 좌표데이터값이 undefined이면 아무것도 하지 않고 바로 다음 반복문으로 넘겨버림.
          return;
        }

        // 좌표데이터값이 undefined가 아니라면, 아래의 내용들을 실행해 줌.
        const amount = (value - min) / range;

        // 이중 forEach loop에서 좌표데이터가 존재하는 위, 경도 각각마다 geometry를 따로 생성해놓음.
        const boxWidth = 1;
        const boxHeight = 1;
        const boxDepth = 1;
        const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

        // 헬퍼들을 특정 위도와 경도로 회전시킴
        lonHelper.rotation.y = THREE.MathUtils.degToRad(lonIndex + file.xllcorner) + lonFudge;
        latHelper.rotation.x = THREE.MathUtils.degToRad(latIndex + file.yllcorner) + latFudge;

        // positionHelper에서 사이즈값을 amount값에 따라서 달리 조정한 뒤,
        // 그것의 자식노드인 originHelper의 전역공간의 변환행렬(scale, rotation, position 등 모든 게 담긴 4*4 행렬)을 최종적으로 각 geometry의 변환행렬로 적용함.
        // 이 originHelper의 전역공간의 변환행렬(matrixWorld)에는 부모의 부모의 부모노드와 부모의 부모노드인 lonHelper, letHelper의 회전, 부모노드인 positionHelper의 사이즈 조정이 반영되어 있음! 
        positionHelper.scale.set(0.005, 0.005, THREE.MathUtils.lerp(0.01, 0.5, amount)); // x, y방향의 scale은 1 -> 0.005로 줄인 값으로 통일하고, z방향의 scale은 amount값에 따라 0.01 ~ 0.5 사이의 값으로 줄여줌.
        originHelper.updateWorldMatrix(true, false); // 부모노드들에 의해 전역공간의 변환행렬의 바뀐 값을 업데이트해줌.
        geometry.applyMatrix4(originHelper.matrixWorld); // originHelper의 전역공간 변환행렬을 각 geometry의 변환행렬로 적용해버림

        // 각 지오메트리의 vertex에 적용할 색상값을 hsl로 계산한 뒤, 그거를 rgb값의 배열로 변환해줌.
        const hue = THREE.MathUtils.lerp(0.7, 0.3, amount);
        const saturation = 1;
        const lightness = THREE.MathUtils.lerp(0.4, 1.0, amount);
        color.setHSL(hue, saturation, lightness);
        // Color.toArray()는 [r, g, b] 요렇게 rgb값이 담긴 배열 형태로 색상값을 리턴해주는 메소드임. 
        // 근데 이 Color 객체의 속성값인 r, g, b는 0 ~ 1사이의 값으로 할당되어 있기 때문에, 이거를 0 ~ 255사이의 값으로 변환하기 위해서 각각의 값에 255씩 곱한 값들을 리턴하여 새로운 배열로 만들어서 const rgb에 할당해준거임.
        const rgb = color.toArray().map(v => v * 255);

        // 각 육면체 지오메트리의 vertex 수(36) * rgb 수(3)를 배열의 길이로 갖는 형식화배열을 생성해 줌.
        const numVerts = geometry.getAttribute('position').count; // geometry.getAttribute('position')는 해당 geometry의 각 vertex의 Vector3 위치값이 담긴 배열을 리턴할거고, geometry.getAttribute('position').count는 그 배열에 담긴 Vector3의 개수를 리턴해준다고 함.
        const itemSize = 3; // r, g, b
        const colors = new Uint8Array(itemSize * numVerts); // 36 * 3 개의 배열 길이를 갖는 형식화 배열

        // 형식화 배열을 forEach loop로 돌리면서
        // 각 vertex 하나당 r, g, b 값들을 반복적으로 저장함으로써, 형식화 배열에는 각 vertex에 똑같은 r,g,b값들이 반복적으로 지정될거임.
        colors.forEach((v, index) => {
          colors[index] = rgb[index % 3]; // rgb[]에 들어가는 인덱스값은 3으로 나눈 나머지니까 0, 1, 2중에 하나만 들어가겠지. 그니까 r, g, b값이 반복적으로 할당된다는 뜻임.
        });

        // BufferAttribute는 BufferGeometry와 연관된 속성들(컬러, 위치값, 노말, uv 등등)에 대한 데이터를 형식화 배열로 받아서 저장하는 클래스임.
        // 이렇게 BufferAttribute를 미리 만들어놓고 geometry.setAttribute('attributeName', BufferAttribute) 이렇게 지오메트리 속성에 할당해주면 gpu에 데이터를 더 효율적으로 전달할 수 있다고 함.
        // BufferAttribute(array : TypedArray, itemSize : Integer, normalized : Boolean)에서 itemSize는 지오메트리의 버텍스 하나당 할당해줘야 하는 값의 개수를 의미한다고 함.
        const normalized = true;
        const colorAttribute = new THREE.BufferAttribute(colors, itemSize, normalized);
        geometry.setAttribute('color', colorAttribute); // 이렇게 하면 각 지오메트리의 vertex들에 각각의 color값이 지정된거임. 물론 하나의 지오메트리 내부의 vertex들은 모두 동일한 색상값이 지정되었겠지?

        geometries.push(geometry) // 따로 생성한 geometry들을 넣어줌.
      });
    });

    // 생성한 geometry들을 BufferGeometryUtils안에 있는 mergeBufferGeometry를 이용해서 하나로 합쳐버림.
    // 이 때 BufferGeometryUtils도 OrbitControls처럼 THREE와 파일 위치가 다르기 때문에 따로 불러와야 함.
    const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries, false); // geometry들이 담긴 배열을 전달하고, 병합된 지오메트리들의 그룹을 생성할 지 여부를 boolean값으로 전달함.
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true // 각 지오메트리마다 vertex에 할당된 고유한 색상값으로 메쉬안에서 해당 지오메트리 영역만 그 색상값으로 렌더해주는 옵션인거 같음. 기본값은 false라고 함.
    });
    const mesh = new THREE.Mesh(mergedGeometry, material); // 병합된 지오메트리 하나를 이용해서 결과적으로 하나의 메쉬만 만든거임.
    scene.add(mesh);
  }

  loadFile('https://threejsfundamentals.org/threejs/resources/data/gpw/gpw_v4_basic_demographic_characteristics_rev10_a000_014mt_2010_cntm_1_deg.asc')
    .then(parseData)
    .then(addBoxes)
    .then(render); // 얘는 박스 메쉬들의 위치, 크기까지 모두 지정하고 나서 render 함수를 호출해야 화면에 실제로 렌더링되겠지

  // resize renderer
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  // OrbitControls.update()에 의해서 render를 호출하려는건지, 
  // 아니면 실제로 change 이벤트나 resize 이벤트에 의해서 render를 호출하려는건지 구분해주는 변수
  let renderRequested = false;

  // render
  function render() {
    renderRequested = undefined; // renderRequested를 초기화함

    // 렌더러가 리사이즈되면 씬을 담는 카메라의 비율도 캔버스 비율에 맞게 업데이트되어야 함
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    // 카메라의 transform에 변화가 있다면 반드시 호출해줘야 함.
    // 근데 얘를 호출하는 것 자체가 OrbitControls에 'change'이벤트를 보내는거기 때문에
    // requestAnimateIfNotRequested 함수 재호출로 인하여, render함수 내에서 render함수를 중복 호출할 우려가 있음.
    // 이 때 update()에 의한 것이 아니라, OrbitControls에서 실제로 change 이벤트를 받거나, 브라우저에서 resize이벤트를 받음으로 인해서
    // render함수를 호출했을 때 이미 renderRequested가 true상태이기 때문에, requestAnimateIfNotRequested가 재호출되어도
    // if block 안쪽으로 들어가지 못하기 때문에 render 함수를 중복 호출하는걸 방지할 수 있음.
    controls.update();

    renderer.render(scene, camera);
  }
  render();

  function requestAnimateIfNotRequested() {
    if (!renderRequested) {
      renderRequested = true;
      requestAnimationFrame(render);
    }
  }

  controls.addEventListener('change', requestAnimateIfNotRequested);
  window.addEventListener('resize', requestAnimateIfNotRequested);
}

main();
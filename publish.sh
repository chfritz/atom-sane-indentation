VERSION=$(node -e "x = `cat package.json`; console.log('v' + x.version)")
git commit -a
git tag ${VERSION}
git push
git push origin ${VERSION}
apm publish -t ${VERSION}
